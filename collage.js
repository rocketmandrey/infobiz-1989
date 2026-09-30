// Paper-cutout VHS teleshop promo. Reads clips/<clip>/scene.json (shots, layers, timing), cut-outs from assets/, anchors from anchors.json.
// Motion is stop-motion: everything is posterized to 12 fps, each 12 fps step re-jitters every cut-out.
// index.html?clip=kooperator | cherkizon
const JIT = 0.3;   // stop-motion jitter
const W = 720, H = 1280, STEP = 1 / 12, ENTER = 0.34, EXIT = 0.25;
const c = document.getElementById('c'), X0 = c.getContext('2d', { willReadFrequently: true });
let x = X0;   // swapped to OFF while a previous scene is drawn for a transition
const OFF = document.createElement('canvas'); OFF.width = W; OFF.height = H; const XO = OFF.getContext('2d');
const P = new URLSearchParams(location.search).get('clip') || 'kooperator', A = 'assets/';
let S, IMG = {}, AN = {};
const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(src); i.src = src; });
const hash = (...a) => { let h = 2166136261; for (const v of a) { h ^= Math.floor(v * 1000); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };
const backOut = p => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2; };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const band = y => 0.24 + (y - 0.07) * (0.7 - 0.24) / 0.7;   // layout band 0.07..0.77 H -> between the title and the subtitles, inside the Reels safe zone

(async () => {
  S = await (await fetch(`clips/${P}/scene.json`)).json();
  AN = await (await fetch('anchors.json')).json();
  CH = chunks((await (await fetch(`clips/${P}/align.json`)).json()).words);
  const ids = new Set(P === 'kooperator' ? ['gum_paper'] : []);
  for (const s of S.shots) { ids.add(s.bg); for (const l of s.layers) { if (l.role !== 'code') ids.add(l.id); if (l.swap) ids.add(l.swap.id); if (l.quad && P !== 'kooperator') ids.add(l.quad.to + '_glass'); } }
  await Promise.all([...ids].map(async id => { IMG[id] = await load(A + id + (id.startsWith('bg_') ? '.jpg' : '.png')); }));

  IMG.zx_load = document.createElement('canvas'); IMG.zx_load.width = 440; IMG.zx_load.height = 320;
  GRAIN = document.createElement('canvas'); GRAIN.width = GRAIN.height = 256;
  const g = GRAIN.getContext('2d'), d = g.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
  await document.fonts.ready;
  window.ready = true;
})();
let GRAIN;

function paperShape(g, pts, fill, edge) {   // hand-cut paper: jagged outline, white border
  g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath();
  g.lineJoin = 'round'; g.lineWidth = edge; g.strokeStyle = '#fbf7ee'; g.stroke(); g.fillStyle = fill; g.fill();
}
function halftone(g, w, h, color, r) {   // printed dot screen
  g.fillStyle = color; for (let y = 0; y < h; y += 9) for (let x = (y / 9 % 2) * 4.5; x < w; x += 9) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
}
function bubble(txt) {   // speech bubble cut out of a comic page: jagged edge, cream paper, dot screen, printed lettering
  const b = document.createElement('canvas'); b.width = 540; b.height = 320; const g = b.getContext('2d');
  const pts = []; for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2, j = 1 + (hash(i, 3) - .5) * .05; pts.push([270 + Math.cos(a) * 240 * j, 130 + Math.sin(a) * 105 * j]); if (i === 38) pts.push([150, 300]); }
  paperShape(g, pts, '#f3e9cf', 22);
  g.save(); g.clip(); halftone(g, 540, 320, 'rgba(230,80,120,.22)', 2.2); g.restore();
  g.lineWidth = 5; g.strokeStyle = '#1a1410'; g.stroke();
  g.font = '900 60px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(220,30,60,.8)'; g.fillText(txt, 273, 134, 420); g.fillStyle = '#1a1410'; g.fillText(txt, 270, 130, 420);   // mis-registered print
  return b;
}
function caption(txt) {   // strip of typewritten paper
  const b = document.createElement('canvas'); b.width = 760; b.height = 120; const g = b.getContext('2d');
  const pts = [[8, 14], [752, 6], [746, 108], [14, 114]]; paperShape(g, pts, '#f6efdc', 16);
  g.font = 'bold 50px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#1a1410'; g.fillText(txt, 380, 62, 700); return b;
}
function alien() {   // 8-bit invader sprite, printed as a sticker
  const m = ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000'], px = 30;
  const b = document.createElement('canvas'); b.width = 11 * px + 40; b.height = 8 * px + 40; const g = b.getContext('2d');
  g.fillStyle = '#fbf7ee'; m.forEach((r, y) => [...r].forEach((c, xx) => c === '1' && g.fillRect(20 + xx * px - 12, 20 + y * px - 12, px + 24, px + 24)));
  g.fillStyle = '#3cff5a'; m.forEach((r, y) => [...r].forEach((c, xx) => c === '1' && g.fillRect(20 + xx * px, 20 + y * px, px, px)));
  g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 20; y < b.height; y += 5) g.fillRect(0, y, b.width, 2); return b;
}
function codeImg(l, s, tq) {
  if (l.id === 'zx_load') return zxLoad(Math.round((tq - s.t0 - l.at) / STEP) + 4);
  const key = l.id + ':' + (l.text || '');
  return IMG[key] ||= ({ bubble, stamp, caption, alien, tape, card, lcd }[l.id])(l.text, l);
}
function card(txt) {   // torn brown cardboard with a felt-tip marker price / notice, lines split on '|'
  const L = txt.split('|'), b = document.createElement('canvas'); b.width = 620; b.height = 90 + 110 * L.length; const g = b.getContext('2d');
  const pts = []; for (let i = 0; i <= 10; i++) pts.push([10 + i * 60 + (hash(i, 61) - .5) * 14, 10 + (hash(i, 62) - .5) * 12]);
  for (let i = 10; i >= 0; i--) pts.push([10 + i * 60 + (hash(i, 63) - .5) * 14, b.height - 10 + (hash(i, 64) - .5) * 12]);
  paperShape(g, pts, '#b98c5a', 4); g.save(); g.clip(); g.fillStyle = 'rgba(90,60,30,.18)'; for (let y = 0; y < b.height; y += 7) g.fillRect(0, y, 620, 2); g.restore();   // corrugation
  g.font = 'bold 92px "Marker Felt", "Comic Sans MS", "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#15110e';
  L.forEach((l, r) => { g.save(); g.translate(310, 90 + r * 110); g.rotate((hash(r, 65) - .5) * .06); g.fillText(l, 0, 0, 570); g.restore(); }); return b;
}
function lcd(txt, l) {   // grey-green LCD, the whole glass: with l.quad the canvas takes the screen's aspect and is warped onto its quad
  if (l?.quad) { const ar = AN[l.quad.to].screen_ar || 3, h = 200, w = Math.round(h * ar), b = document.createElement('canvas'); b.width = w; b.height = h;
    const g = b.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#a9b78f'); gr.addColorStop(1, '#93a37c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.06)'; for (let y = 0; y < h; y += 5) g.fillRect(0, y, w, 1);
    const mx = w * 0.08, num = /^[\d.,-]+$/.test(txt), cells = num ? Math.max(4, txt.length) : txt.length;   // calculator: 8 digit cells, right-aligned; pager: centred line
    let fs = Math.min(h * (num ? 0.8 : 0.62), (w - 2 * mx) / (cells * 0.62)); g.font = `bold ${fs}px ${num ? '"Courier New"' : 'Menlo, "Courier New"'}, monospace`;
    const draw = (t, col, blur) => { g.fillStyle = col; g.shadowColor = blur ? 'rgba(20,30,10,.35)' : 'transparent'; g.shadowBlur = blur; g.shadowOffsetY = blur ? 3 : 0;
      if (num) { g.textAlign = 'right'; g.fillText(t, w - mx, h / 2 + fs * 0.04); } else { g.textAlign = 'center'; g.fillText(t, w / 2, h / 2 + fs * 0.04); } };
    if (num) draw('8'.repeat(cells), 'rgba(30,40,20,.07)', 0);   // unlit segments, faint
    draw(txt, '#1c2414', 6); return b; }
  const b = document.createElement('canvas'); b.width = 60 + 44 * Math.max(3, txt.length); b.height = 110; const g = b.getContext('2d');
  g.fillStyle = '#9fae86'; g.fillRect(0, 0, b.width, 110); g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < 110; y += 4) g.fillRect(0, y, b.width, 1);
  g.font = 'bold 80px Menlo, "Courier New", monospace'; g.textAlign = txt.length < 3 ? 'right' : 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(30,40,20,.18)'; g.fillText(txt.length < 3 ? '888888'.slice(0, 6) : '8'.repeat(txt.length), txt.length < 3 ? b.width - 24 : b.width / 2, 58);   // unlit segments
  g.fillStyle = '#1e2616'; g.fillText(txt, txt.length < 3 ? b.width - 24 : b.width / 2, 58); return b;
}
function tape() {   // strip of yellowed sticky tape, torn ends
  const b = document.createElement('canvas'); b.width = 300; b.height = 80; const g = b.getContext('2d');
  g.beginPath(); g.moveTo(0, 6); for (let y = 6; y <= 74; y += 8) g.lineTo(hash(y, 51) * 12, y); for (let y = 74; y >= 6; y -= 8) g.lineTo(300 - hash(y, 52) * 12, y); g.closePath();
  g.fillStyle = 'rgba(240,226,168,.88)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 14, 300, 10); return b;
}
function stamp(txt) {   // red rubber stamp, uneven ink
  const b = document.createElement('canvas'); b.width = 560; b.height = 190; const g = b.getContext('2d'); g.font = '900 56px "Courier New", monospace';
  const tw = Math.max(300, g.measureText(txt).width + 80); b.width = tw; g.font = '900 56px "Courier New", monospace';
  g.strokeStyle = g.fillStyle = '#d4121e'; g.lineWidth = 10; g.beginPath(); g.roundRect(10, 10, tw - 20, 170, 18); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.roundRect(26, 26, tw - 52, 138, 10); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, tw / 2, 97, tw - 70);
  g.globalCompositeOperation = 'destination-out';   // worn ink
  for (let i = 0; i < 350; i++) { g.globalAlpha = .2 + hash(i, 1) * .5; g.fillRect(hash(i, 2) * tw, hash(i, 3) * 190, 1 + hash(i, 4) * 5, 1 + hash(i, 5) * 3); }
  return b;
}

function zxLoad(step) {   // Spectrum loading screen shot off a CRT: uneven drifting border bars, soft glow, scanlines, dirty corners
  const b = IMG.zx_load, g = b.getContext('2d'), bw = 46;
  g.fillStyle = '#141210'; g.fillRect(0, 0, 440, 320);   // dark bezel edge: the picture is warped into the TV glass (quad)
  g.save(); g.beginPath(); g.roundRect(12, 12, 416, 296, 34); g.clip();
  g.filter = 'blur(1.2px)';
  for (let y = 12, n = 0; y < 310; n++) {   // bars: random height, slanted and shifted per row like a real tape load
    const h = 3 + Math.floor(hash(step, n, 9) * 8), c = hash(step, n) > .5 ? (hash(step, n, 3) > .5 ? '#d8392e' : '#3fc7c9') : (hash(step, n, 5) > .5 ? '#e0d24a' : '#3043b8');
    g.fillStyle = c; g.fillRect(12 + (hash(step, n, 7) - .5) * 14, y, 440, h); y += h;
  }
  g.fillStyle = '#cbc3ae'; g.fillRect(12 + bw, 12 + bw * .7, 416 - 2 * bw, 296 - 1.4 * bw);
  const rows = Math.min(24, step * 2);   // the picture paints in from the top, like a real load
  for (let r = 0; r < rows; r++) { const off = (hash(r, step, 4) - .5) * 6;
    for (let q = 0; q < 16; q++) { g.fillStyle = ['#2a2fa0', '#a8322c', '#9a3a9a', '#3a9a3a', '#3a9a9a', '#b0a238', '#1a1a1a'][Math.floor(hash(r, q) * 7)]; g.fillRect(12 + bw + q * 20.2 + off, 12 + bw * .7 + r * 7.2, 20.2, 7.2); } }
  g.filter = 'blur(0.8px)'; g.font = 'bold 24px Menlo, monospace';
  g.fillStyle = 'rgba(255,40,40,.7)'; g.fillText('Program: KURS', 74, 283); g.fillStyle = 'rgba(40,220,255,.7)'; g.fillText('Program: KURS', 70, 281);
  g.fillStyle = '#111'; g.fillText('Program: KURS', 72, 282); g.filter = 'none';
  g.globalCompositeOperation = 'screen';   // phosphor glow
  const gl = g.createRadialGradient(220, 160, 20, 220, 160, 230); gl.addColorStop(0, 'rgba(255,255,230,.35)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(0, 0, 440, 320);
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(0,0,0,.28)'; for (let y = 12; y < 310; y += 3) g.fillRect(12, y, 416, 1);
  for (let i = 0; i < 260; i++) { g.fillStyle = hash(step, i, 11) > .5 ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.35)'; g.fillRect(hash(step, i, 12) * 440, hash(step, i, 13) * 320, 2, 1); }
  const v = g.createRadialGradient(220, 160, 120, 220, 160, 260); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,5,0,.75)'); g.fillStyle = v; g.fillRect(0, 0, 440, 320);
  g.restore(); return b;
}

const lid = l => l.as || l.id;
const tgt = (s, name) => { const j = s.layers.findIndex(l => lid(l) === name); return [s.layers[j], j]; };
function anc(l, name) {   // anchor [x, y] in 0..1 of the layer's image (anchors.json); 'center' / a literal pair also work
  if (Array.isArray(name)) return name; if (!name || name === 'center') return [.5, .5];
  const a = AN[l.id]?.[name]; if (!a) throw new Error(`no anchor ${l.id}.${name}`); return a;
}
function world(l, q, a) {   // image anchor -> frame px under pose q (same transform as drawCut)
  const sc = l._s * q.sc, dx = (a[0] - .5) * l._im.width * sc * (q.sx ?? 1), dy = (a[1] - .5) * l._im.height * sc * (q.sy ?? 1), r = q.rot * Math.PI / 180;
  return [q.px + dx * Math.cos(r) - dy * Math.sin(r), q.py + dx * Math.sin(r) + dy * Math.cos(r)];
}
function fromPt(s, l, tq, k, ex) {   // fan origin: literal [x, y] or {to, at} = an anchor of another layer
  if (Array.isArray(l.from)) return l.from; const [tl, tj] = tgt(s, l.from.to), q = pose(s, tl, tj, tq, k, ex);
  if (!q) return [.5, .5]; const P = world(tl, q, anc(tl, l.from.at)); return [P[0] / W, P[1] / H];
}
function clipAbove(s, l, tq, k, ex) {   // keep only what is above the target's anchor line (cassette into slot, statue into the doll)
  const A = l.attach, [tl, tj] = tgt(s, A.to), q = pose(s, tl, tj, tq, k, ex); if (!q) return;
  const P = world(tl, q, anc(tl, A.clip)); x.translate(P[0], P[1]); x.rotate(q.rot * Math.PI / 180);
  x.beginPath(); x.rect(-4000, -8000, 8000, 8000); x.setTransform(1, 0, 0, 1, 0, 0); x.clip();
}
function tri(im, s0, s1, s2, d0, d1, d2) {   // affine-map a source triangle of im onto a destination triangle
  const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, g = p => [p[0] + (p[0] - cx) * .05, p[1] + (p[1] - cy) * .05];
  x.save(); x.beginPath(); x.moveTo(...g(d0)); x.lineTo(...g(d1)); x.lineTo(...g(d2)); x.closePath(); x.clip();
  const ax = s1[0] - s0[0], ay = s1[1] - s0[1], bx = s2[0] - s0[0], by = s2[1] - s0[1], det = ax * by - ay * bx;
  const c1 = d1[0] - d0[0], c2 = d1[1] - d0[1], e1 = d2[0] - d0[0], e2 = d2[1] - d0[1];
  const m11 = (c1 * by - e1 * ay) / det, m12 = (e1 * ax - c1 * bx) / det, m21 = (c2 * by - e2 * ay) / det, m22 = (e2 * ax - c2 * bx) / det;
  x.transform(m11, m21, m12, m22, d0[0] - m11 * s0[0] - m12 * s0[1], d0[1] - m21 * s0[0] - m22 * s0[1]); x.drawImage(im, 0, 0); x.restore();
}
function roundQuad(P, r) {   // path: quad with rounded corners (CRT glass)
  x.beginPath();
  for (let i = 0; i < 4; i++) { const p = P[i], a = P[(i + 3) % 4], b = P[(i + 1) % 4], ua = Math.hypot(a[0] - p[0], a[1] - p[1]), ub = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const pa = [p[0] + (a[0] - p[0]) / ua * r, p[1] + (a[1] - p[1]) / ua * r], pb = [p[0] + (b[0] - p[0]) / ub * r, p[1] + (b[1] - p[1]) / ub * r];
    i ? x.lineTo(...pa) : x.moveTo(...pa); x.quadraticCurveTo(p[0], p[1], ...pb); }
  x.closePath();
}
function drawQuad(im, P, alpha, r = 0, flat = false) {   // picture into the CRT glass: 12x12 mesh of affine triangles, overscanned 4% with a
  // barrel bulge (convex tube), clipped by the rounded glass outline, plus vignette and glare
  const N = 12, w = im.width, h = im.height, L = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const os = flat ? 0.005 : 0.04, at = (u, v) => { const U = -os + u * (1 + 2 * os), V = -os + v * (1 + 2 * os), p = L(L(P[0], P[1], U), L(P[3], P[2], U), V), c = L(L(P[0], P[1], .5), L(P[3], P[2], .5), .5);
    const du = U - .5, dv = V - .5, k = flat ? 1 : 1 - 0.07 * (du * du + dv * dv); return [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k]; };   // barrel
  x.save(); x.globalAlpha = alpha; roundQuad(P, r); x.clip();
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const u0 = i / N, u1 = (i + 1) / N, vA = j / N, vB = (j + 1) / N;
    tri(im, [u0 * w, vA * h], [u1 * w, vA * h], [u0 * w, vB * h], at(u0, vA), at(u1, vA), at(u0, vB));
    tri(im, [u1 * w, vB * h], [u0 * w, vB * h], [u1 * w, vA * h], at(u1, vB), at(u0, vB), at(u1, vA)); }
  const c = L(L(P[0], P[1], .5), L(P[3], P[2], .5), .5), R = Math.hypot(P[2][0] - P[0][0], P[2][1] - P[0][1]) / 2;
  const vg = x.createRadialGradient(c[0], c[1], R * .45, c[0], c[1], R * 1.05); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${flat ? .2 : .55})`);
  x.fillStyle = vg; x.fillRect(c[0] - R * 1.2, c[1] - R * 1.2, R * 2.4, R * 2.4);
  const gl = x.createLinearGradient(P[0][0], P[0][1], P[2][0], P[2][1]); gl.addColorStop(0, 'rgba(255,255,255,.18)'); gl.addColorStop(.4, 'rgba(255,255,255,0)');
  x.fillStyle = gl; x.fillRect(c[0] - R * 1.2, c[1] - R * 1.2, R * 2.4, R * 2.4); x.restore();
}
function quadLayer(s, l, k, tq, ex) {
  const [tl, tj] = tgt(s, l.quad.to), q = pose(s, tl, tj, tq, k, ex); if (!q) return; const u = tq - s.t0 - l.at; if (u < 0) return;
  const n = l.quad.nudge || [0, 0], P0 = AN[tl.id][l.quad.at].map(a => { const p = world(tl, q, a); return [p[0] + n[0] * W, p[1] + n[1] * H]; });
  const cx = P0.reduce((a, p) => a + p[0], 0) / 4, cy = P0.reduce((a, p) => a + p[1], 0) / 4, ins = 1 - (l.quad.inset ?? 0.004);   // stay inside the glass edge
  const P = P0.map(p => [cx + (p[0] - cx) * ins, cy + (p[1] - cy) * ins]);
  const r = (AN[tl.id].screen_r || 0) * Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]);
  drawQuad(l._im, P, clamp(u / 0.15) * (l.quad.flat ? 1 : Math.round(tq / STEP) % 5 ? 1 : .85), r, l.quad.flat);
}
function beam(s, k, tq) {   // projector light: from the lens anchor to the slide's near edge
  const B = s.beam, [pl, pj] = tgt(s, B.from.to), [sl, sj] = tgt(s, B.to), qp = pose(s, pl, pj, tq, k, 0), qs = pose(s, sl, sj, tq, k, 0);
  if (!qp || !qs || tq - s.t0 < B.at) return; const L = world(pl, qp, anc(pl, B.from.at)), c = [[0, 0], [1, 0], [1, 1], [0, 1]].map(a => world(sl, qs, a));
  c.sort((a, b) => Math.hypot(a[0] - L[0], a[1] - L[1]) - Math.hypot(b[0] - L[0], b[1] - L[1]));
  const g = x.createLinearGradient(L[0], L[1], (c[0][0] + c[1][0]) / 2, (c[0][1] + c[1][1]) / 2); g.addColorStop(0, 'rgba(255,244,190,.6)'); g.addColorStop(1, 'rgba(255,244,190,.1)');
  x.save(); x.fillStyle = g; x.beginPath(); x.moveTo(...L); x.lineTo(...c[0]); x.lineTo(...c[1]); x.closePath(); x.fill(); x.restore();
}

const EASE = { back: backOut, in: p => p * p, lin: p => p, out: p => 1 - (1 - p) ** 2 };

function pose(s, l, i, tq, k, ex = 0) {   // layer l of shot s at posterized time tq; null = not on screen. ex = exit progress (drawn over the next shot)
  // keep cut-outs out of the chrome-word band: bottom edge <= 0.77 H, top >= 0.07 H (only for on-screen targets)
  const fy = y => s.word && y > 0 && y < 1 ? clamp(band(y) * H, 0.25 * H + l._h, 0.70 * H - l._h)   /* >= 16 px clear of title and subtitle strip (top 0.716 H) */ : y * H;
  const u = tq - (s.t0 + l.at), us = tq - s.t0;
  if (u < 0) return null;
  // attach: my anchor `me` sits on anchor `at` of layer `to` (following its motion); x/y/keys are then offsets from that spot
  let base = null, inh = 0;
  if (l.attach) { const A = l.attach, [tl, tj] = tgt(s, A.to), q = tl && pose(s, tl, tj, tq, k, ex); if (!q) return null;
    const P = world(tl, q, anc(tl, A.at)), n = A.nudge || [0, 0]; inh = A.follow === false ? 0 : q.rot - tl.rot;
    const m = anc(l, A.me), r = (l.rot + inh) * Math.PI / 180, dx = (m[0] - .5) * l._im.width * l._s, dy = (m[1] - .5) * l._im.height * l._s;
    base = [P[0] - (dx * Math.cos(r) - dy * Math.sin(r)) + n[0] * W, P[1] - (dx * Math.sin(r) + dy * Math.cos(r)) + n[1] * H]; }
  const tx = base ? base[0] + l.x * W : l.x * W, ty = base ? base[1] + l.y * H : fy(l.y);
  let px = tx, py = ty, rot = l.rot + inh, sc = 1, alpha = 1, sx = 1, sy = 1, filter = null;
  const squash = t0 => { const d = (u - t0) / 0.35; if (d > 0 && d < 1) { const q = 0.22 * Math.cos(d * Math.PI * 2.5) * (1 - d); sy = 1 - q; sx = 1 + q * .7; py += q * l._h * .5; } };
  const p = clamp(u / ENTER), e = backOut(p);
  const from = { left: [-0.5 * W, ty], right: [1.5 * W, ty], top: [tx, -0.45 * H], bottom: [tx, 1.45 * H] };
  if (from[l.in]) { const [fx, fy0] = from[l.in]; px = fx + (tx - fx) * e; py = fy0 + (ty - fy0) * e; rot += (1 - p) * (l.in === 'left' ? -25 : 25); }
  else if (l.in === 'drop') { const q = clamp(u / 0.3); py = -0.4 * H + (ty + 0.4 * H) * q * q; if (u > 0.3) py -= 26 * Math.max(0, Math.sin((u - 0.3) * 18)) * Math.exp(-(u - 0.3) * 8); rot += (1 - q) * 20; squash(0.3); }
  else if (l.in === 'stamp') { const q = clamp(u / 0.12); sc = 1.9 - 0.9 * q * q; alpha = 0.4 + 0.6 * q; squash(0.12); }
  else if (l.in === 'slap') { const q = clamp(u / 0.1); sc = 1.35 - 0.35 * q * q; rot += (1 - q) * 6; squash(0.1); }
  else if (l.in === 'pop' || l.in === 'grow') { sc = backOut(clamp(u / (l.in === 'grow' ? 0.5 : 0.25))); }
  else if (l.in === 'fan') { const [fx, fy0] = fromPt(s, l, tq, k, ex); px = fx * W + (tx - fx * W) * e; py = fy0 * H + (ty - fy0 * H) * e; sc = 0.3 + 0.7 * e; rot += (1 - p) * 300; }
  else if (l.in === 'hop') { sc = backOut(clamp(u / 0.2)); const q = clamp((u - 0.45) / 0.4);
    px = tx + (l.to[0] * W - tx) * q; py = ty + (l.to[1] * H - fy(l.y)) * q + (fy(l.to[1]) - ty - (l.to[1] * H - fy(l.y))) * q - Math.sin(q * Math.PI) * 0.16 * H; rot += 360 * q; }
  // keys: [dt from shot start, x, y, rot, scale, dur = .3, ease = back|in|lin|out|arc]; each key moves from the previous state
  let cx = px, cy = py, cr = rot, cs = sc;
  for (const [dt, kx, ky, kr, ks, dur = 0.3, ease = 'back'] of l.keys || []) {
    if (us < dt) break;
    const q = clamp((us - dt) / dur), f = ease === 'arc' ? q : EASE[ease](q), nx = base ? base[0] + kx * W : kx * W, ny = base ? base[1] + ky * H : fy(ky);
    px = cx + (nx - cx) * f; py = cy + (ny - cy) * f - (ease === 'arc' ? Math.sin(q * Math.PI) * 0.12 * H : 0);
    rot = cr + (kr + inh - cr) * f; sc = cs + (ks - cs) * f; cx = nx; cy = ny; cr = kr + inh; cs = ks;
    if (q < 1) break;
  }
  const step = Math.round(tq / STEP);
  for (const f of l.fx || []) {   // secondary animation
    const [a0, b0] = [f.a ?? 0, f.b ?? 99]; if (us < a0 || us > b0) continue; const amp = f.amp ?? 1;
    if (f.k === 'bob') { py += Math.sin(tq * 7 + i) * 7 * amp; rot += Math.sin(tq * 5 + i) * 2.5 * amp; }
    if (f.k === 'shake') { px += (hash(i, step, 21) - .5) * 20 * amp; py += (hash(i, step, 22) - .5) * 20 * amp; }
    if (f.k === 'ring') rot += (step % 2 ? 1 : -1) * 9 * amp;
    if (f.k === 'hopping') py -= Math.abs(Math.sin((us - a0) * 11)) * 40 * amp;
    if (f.k === 'blink') alpha = step % 3 === 0 ? 0.15 : 1;
    if (f.k === 'pulse') sc *= 1 + (step % 2) * 0.1 * amp;
    if (f.k === 'spin') rot += (us - a0) * 360 * amp;
    if (f.k === 'flutter') rot += Math.sin(tq * 31) * 5 * amp;
    if (f.k === 'develop') { const q = clamp((us - a0) / (b0 - a0)); filter = `brightness(${1 + 2.2 * (1 - q)}) contrast(${0.4 + 0.6 * q}) sepia(${0.6 * (1 - q)})`; }
    if (f.k === 'dial' && s.dial) {   // rotary dial: each digit winds forward to its finger stop and runs back
      const j = Math.floor((us - s.dialAt) / 0.32), ph = (us - s.dialAt) - j * 0.32;
      if (j >= 0 && j < s.dial.length) { const ang = (+s.dial[j] || 10) * 28; rot += ph < 0.15 ? ang * ph / 0.15 : ang * (1 - (ph - 0.15) / 0.17); }
    }
  }
  const out = (dir, q) => { const d = { left: [-W, 0], right: [W, 0], top: [0, -H], bottom: [0, H] }[dir] || [0, H]; px += d[0] * q * q; py += d[1] * q * q; rot += 30 * q; };
  if (l.leave && u > l.leave) out(l.out || l.in, clamp((u - l.leave) / 0.3));
  if (ex > 0) out(l.out || (['left', 'right', 'top'].includes(l.in) ? l.in : 'bottom'), ex);
  px += (hash(k, i, step) - .5) * 5 * JIT; py += (hash(k, i, step, 1) - .5) * 5 * JIT; rot += (hash(k, i, step, 2) - .5) * 1.6 * JIT;   // stop-motion: re-placed by hand every step
  return sc <= 0.01 ? null : { px, py, rot, sc, alpha, sx, sy, filter };
}

function burst(b, u, k) {   // code particles on impacts: dust | sparks | lines
  if (u < 0) return;
  if (b.kind === 'ink') return ink(b, u, k);
  if (b.kind === 'fizz') return fizz(b, u, k);
  if (u > 0.5) return; const q = u / 0.5, bx = b.x * W, by = b.y * H, n = b.n || 8;
  x.save();
  for (let j = 0; j < n; j++) {
    const a = j / n * Math.PI * 2 + hash(k, j, 31) * .6, r = (b.r || 90) * (0.35 + q) * (0.7 + hash(k, j, 32) * .6), px = bx + Math.cos(a) * r, py = by + Math.sin(a) * r * (b.kind === 'dust' ? .45 : 1);
    if (b.kind === 'dust') { x.globalAlpha = (1 - q) * .85; x.fillStyle = j % 2 ? '#d9cdb4' : '#bfb198'; x.strokeStyle = '#fbf7ee'; x.lineWidth = 3; x.beginPath(); x.arc(px, py, 26 * (1 - q * .5) * (0.6 + hash(k, j, 33)), 0, 7); x.fill(); x.stroke(); }
    if (b.kind === 'sparks') star(px, py, 22 * (1 - q * .6), 1 - q);
    if (b.kind === 'steam') { x.globalAlpha = (1 - q) * .9; x.fillStyle = '#f7f5f0'; x.strokeStyle = '#d8d2c6'; x.lineWidth = 3; x.beginPath(); x.arc(bx + (px - bx) * .6, by - q * 160 - hash(k, j, 34) * 60, 34 * (0.6 + q) * (0.6 + hash(k, j, 35)), 0, 7); x.fill(); x.stroke(); }
    if (b.kind === 'lines') { x.globalAlpha = 1 - q; x.strokeStyle = '#140522'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath();
      x.moveTo(bx + Math.cos(a) * (b.r || 90) * .6, by + Math.sin(a) * (b.r || 90) * .6); x.lineTo(bx + Math.cos(a) * (b.r || 90) * (1 + q * .3), by + Math.sin(a) * (b.r || 90) * (1 + q * .3)); x.stroke(); }
  }
  x.restore();
}

function ink(b, u, k) {   // stamp ink: splatter flies out in 2 steps and stays, blots spread a little
  const q = clamp(u / 0.17), bx = b.x * W, by = b.y * H;
  x.save(); x.fillStyle = '#c8101c'; x.globalAlpha = .85;
  for (let j = 0; j < (b.n || 16); j++) {
    const a = hash(k, j, 61) * Math.PI * 2, r = (b.r || 160) * (0.55 + hash(k, j, 62) * .7) * q, rr = (3 + hash(k, j, 63) * 11) * (1 + clamp(u - .17) * .6);
    x.beginPath(); x.ellipse(bx + Math.cos(a) * r, by + Math.sin(a) * r * .55, rr * 1.4, rr, a, 0, 7); x.fill();
  }
  x.restore();
}
function fizz(b, u, k) {   // soda bubbles rising through the frame
  if (u > 2.6) return; x.save(); x.strokeStyle = 'rgba(255,255,255,.85)'; x.fillStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 3;
  for (let j = 0; j < (b.n || 20); j++) {
    const px = (0.08 + hash(k, j, 71) * .84) * W + Math.sin(u * 6 + j) * 10, py = H * 1.02 - ((u * (220 + hash(k, j, 72) * 260) + hash(k, j, 73) * H) % (H * 1.1));
    x.beginPath(); x.arc(px, py, 6 + hash(k, j, 74) * 16, 0, 7); x.fill(); x.stroke();
  }
  x.restore();
}

function word(s, k, tq) {   // chrome only for the course title and the finale; other lines get a clipped newspaper headline
  const wp = tq - s.t0 - 0.25; if (!s.word || wp <= 0) return; const pop = backOut(clamp(wp / 0.25)), jy = (hash(k, Math.round(tq / STEP), 4) - .5) * 4 * JIT;
  if (s.chrome) return chrome(s.word, W / 2, 0.17 * H + jy, 600, 86, pop);
  x.save(); x.translate(W / 2, 0.17 * H + jy); x.rotate((hash(k, 81) - .5) * .08); x.scale(pop, pop);
  x.font = '900 66px "Arial Black", Impact, sans-serif'; const tw = Math.min(600, x.measureText(s.word).width) + 50;
  x.shadowColor = 'rgba(25,8,40,.5)'; x.shadowOffsetX = 7; x.shadowOffsetY = 9;
  const pts = [[-tw / 2, -52], [tw / 2, -58], [tw / 2 + 6, 50], [-tw / 2 - 4, 56]]; x.beginPath(); pts.forEach(([a, b2], i) => i ? x.lineTo(a, b2) : x.moveTo(a, b2)); x.closePath();
  x.fillStyle = '#efe6cc'; x.fill(); x.shadowColor = 'transparent';
  x.save(); x.clip(); x.translate(-tw / 2, -60); halftone(x, tw + 10, 120, 'rgba(60,40,20,.10)', 1.6); x.restore();
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(210,20,30,.85)'; x.fillText(s.word, 3, 3, tw - 50); x.fillStyle = '#16110c'; x.fillText(s.word, 0, 0, tw - 50);
  x.restore();
}

function drawCut(im, l, q, alpha, shadow) {
  const s = l._s * q.sc;
  x.save(); x.globalAlpha = alpha * (q.alpha ?? 1) * (l.id === 'tape' ? .9 : 1); x.translate(q.px, q.py); x.rotate(q.rot * Math.PI / 180); x.scale(s * (q.sx ?? 1), s * (q.sy ?? 1));
  if (q.filter) x.filter = q.filter;
  if (l.id === 'stamp' && l.ink !== 'normal') x.globalCompositeOperation = 'multiply';   // ink printed into the paper texture, not a sticker
  if (shadow && l.id !== 'stamp' && l.id !== 'tape') { x.shadowColor = 'rgba(25,8,40,.55)'; x.shadowOffsetX = l.attach?.rest ? 3 : 10; x.shadowOffsetY = l.attach?.rest ? 4 : 13; x.shadowBlur = 0; }   // resting on something: contact shadow
  x.drawImage(im, -im.width / 2, -im.height / 2); x.restore();
}

function chrome(txt, cx, cy, maxW, size, pop) {   // airbrushed chrome lettering: sky-blue top, brown horizon line, orange-white bottom
  if (!txt || pop <= 0) return;
  x.save(); x.font = `italic 900 ${size}px "Arial Black", Impact, sans-serif`;
  const w = x.measureText(txt).width, s = Math.min(1, maxW / w) * pop;
  x.translate(cx, cy); x.scale(s, s); x.transform(1, 0, -0.18, 1, 0, 0); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  const g = x.createLinearGradient(0, -size / 2, 0, size / 2);
  g.addColorStop(0, '#1e3bd6'); g.addColorStop(.3, '#bff3ff'); g.addColorStop(.5, '#fff'); g.addColorStop(.52, '#3b1600'); g.addColorStop(.62, '#b0531b'); g.addColorStop(.85, '#ffc36b'); g.addColorStop(1, '#fff');
  x.lineWidth = 22; x.strokeStyle = '#ff1fbf'; x.strokeText(txt, 0, 0);
  x.lineWidth = 10; x.strokeStyle = '#140522'; x.strokeText(txt, 0, 0);
  x.fillStyle = g; x.fillText(txt, 0, 0);
  x.lineWidth = 1.5; x.strokeStyle = 'rgba(255,255,255,.8)'; x.strokeText(txt, 0, -2); x.restore();
}

function star(px, py, r, a) {   // four-point sparkle
  x.save(); x.translate(px, py); x.globalAlpha = a; x.fillStyle = '#ffd6f7'; x.shadowColor = '#ff3ad8'; x.shadowBlur = 18;
  x.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .18 : r, an = i * Math.PI / 4; x.lineTo(Math.sin(an) * rr, -Math.cos(an) * rr); } x.fill(); x.restore();
}

function garland(s, q, tq) {   // chain of tear-off strips pulled out of the notice's fringe (pole.tab_fringe) to the pinch point of the hand
  const G = s.garland, u = tq - s.t0 - G.at; if (u < 0) return;
  const [pl] = tgt(s, G.from.to), [hl] = tgt(s, G.to.to); if (!pl?._q || !hl?._q) return;
  const n0 = pl.tab?.nudge || [0, 0], F = world(pl, pl._q, anc(pl, G.from.at)), P = world(hl, q, anc(hl, G.to.at));
  F[0] += n0[0] * W; F[1] += n0[1] * H;
  const L = Math.hypot(P[0] - F[0], P[1] - F[1]), n = Math.max(1, Math.round(L / 46)), sag = Math.min(80, L * .15);
  const pt = f => [F[0] + (P[0] - F[0]) * f, F[1] + (P[1] - F[1]) * f + Math.sin(f * Math.PI) * sag + Math.sin(f * 9 + tq * 6) * 4];
  for (let j = 0; j < n; j++) {   // strips joined end to end along the sagging chain, torn edges, phone number printed along
    const p0 = pt(j / n), p1 = pt((j + 1) / n), len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + 1;
    x.save(); x.translate(...p0); x.rotate(Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) + (hash(j, 44) - .5) * .12);
    x.shadowColor = 'rgba(25,8,40,.45)'; x.shadowOffsetX = 4; x.shadowOffsetY = 6; x.fillStyle = '#f1cfc6';
    x.beginPath(); x.moveTo(0, -15); for (let z = -15; z <= 15; z += 5) x.lineTo(len + (hash(j, z, 43) - .5) * 5, z); x.lineTo(0, 15); x.closePath(); x.fill();
    x.shadowColor = 'transparent'; x.strokeStyle = 'rgba(80,40,40,.35)'; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(len - 1, -14); x.lineTo(len - 1, 14); x.stroke();
    x.fillStyle = '#2a2230'; x.font = 'bold 13px Menlo, monospace'; x.fillText('2-85-06', 4, 5, len - 8); x.restore();
  }
}

function cable(s, tq) {   // AV cable between the two VCRs, ends hidden under them
  const a = s.layers.find(l => l.as === 'vcr_a'), b = s.layers.find(l => l.as === 'vcr_b');
  if (tq < s.t0 + b.at + ENTER) return;
  const ax = a.x * W, ay = a.y * H, bx = b.x * W, by = b.y * H, bx0 = bx, by0 = by, sag = Math.max(ay, by) + 0.13 * H;
  x.save(); x.lineCap = 'round'; x.shadowColor = 'rgba(25,8,40,.55)'; x.shadowOffsetX = 8; x.shadowOffsetY = 10;
  x.beginPath(); x.moveTo(ax, ay); x.bezierCurveTo(ax + 60, sag, bx - 60, sag, bx, by); x.lineWidth = 14; x.strokeStyle = '#fbf7ee'; x.stroke();
  x.shadowColor = 'transparent'; x.lineWidth = 8; x.strokeStyle = '#1a1a1a'; x.stroke(); x.lineWidth = 2; x.strokeStyle = '#666'; x.stroke();
  const us = tq - s.t0;   // a cassette-shaped bulge runs along the cable
  if (s.bump && us > s.bump[0] && us < s.bump[1]) { const p = (us - s.bump[0]) / (s.bump[1] - s.bump[0]), c = (a, b, c2, d) => (1 - p) ** 3 * a + 3 * (1 - p) ** 2 * p * b + 3 * (1 - p) * p * p * c2 + p ** 3 * d;
    const bx = c(ax, ax + 60, bx0 - 60, bx0), by = c(ay, sag, sag, by0); x.fillStyle = '#1a1a1a'; x.strokeStyle = '#fbf7ee'; x.lineWidth = 4; x.beginPath(); x.ellipse(bx, by, 30, 20, 0, 0, 7); x.fill(); x.stroke(); }
  x.restore();
}

function plate(s, tq) {   // final phone plate: the number appears digit by digit as the dial turns
  const u = tq - s.t0 - (s.plateAt ?? 0.1); if (u < 0) return;
  const sc = 0.88 * backOut(clamp(u / 0.3)), cy = 0.315 * H;   // 0.88: clear of the Reels side margins; high: above the Shorts right button column
  x.save(); x.translate(W / 2 + (hash(9, Math.round(tq / STEP)) - .5) * 4 * JIT, cy); x.rotate(-3 * Math.PI / 180); x.scale(sc, sc);
  x.shadowColor = 'rgba(25,8,40,.6)'; x.shadowOffsetX = 12; x.shadowOffsetY = 14;
  x.fillStyle = '#fbf7ee'; x.beginPath(); x.roundRect(-340, -170, 680, 340, 30); x.fill(); x.shadowColor = 'transparent';
  x.fillStyle = '#26307e'; x.beginPath(); x.roundRect(-326, -156, 652, 312, 22); x.fill();   // flat printed ink, no gradient
  x.save(); x.clip(); x.translate(-340, -170); halftone(x, 680, 340, 'rgba(10,12,40,.35)', 2.4); x.restore();
  x.restore();
  chrome('ЗВОНИТЕ!', W / 2, cy - 80 * sc, 460 * sc, 70, sc);
  const n = s.dial ? clamp(Math.floor((tq - s.t0 - s.dialAt) / 0.32) + 1, 0, s.dial.length) : 99;
  let shown = '', d = 0; for (const ch of s.phone) { if (/\d/.test(ch)) { if (d >= n) break; d++; } shown += ch; }
  x.save(); x.font = 'italic 900 124px "Arial Black", Impact'; const full = x.measureText(s.phone).width; x.restore();
  const k2 = Math.min(1, 620 / full) * sc;   // left-aligned growth so the digits land where the full number will be
  x.save(); x.translate(W / 2 - full * k2 / 2, 0); x.font = 'italic 900 124px "Arial Black", Impact'; const w2 = x.measureText(shown).width; x.restore();
  if (shown) chrome(shown, W / 2 - full * k2 / 2 + w2 * k2 / 2, cy + 45 * sc, 9999, 124 * k2, 1);
}

function vhs(t, tq, burst, calm) {   // chroma bleed, tape tracking band, scanlines, faded ORWO grade, grain
  const img = x.getImageData(0, 0, W, H), d = img.data, src = d.slice(), step = Math.round(tq / STEP);
  const band = ((t * 0.23) % 1.3) * H - 0.15 * H;   // tracking band crawls down the picture
  let seed = step * 7919 + 1; const rnd = () => ((seed = Math.imul(seed, 1103515245) + 12345) >>> 8 & 0xffff) / 65536;
  for (let y = 0; y < H; y++) {
    const inBand = !calm && y > band && y < band + 26, bottom = y > H - 22;
    let sh = 0; if (inBand || bottom) sh = Math.round((rnd() - .5) * 18 * Math.max(JIT, .35)); if (burst > 0) sh += Math.round((rnd() - .5) * 60 * burst);
    if (y % 180 < 2) sh += Math.round((rnd() - .5) * 4);
    const dark = y % 3 === 0 ? 0.88 : 1, row = y * W;
    for (let xx = 0; xx < W; xx++) {
      const o = (row + xx) * 4, sx = clamp(xx + sh, 0, W - 1);
      let r = src[(row + clamp(sx + 4, 0, W - 1)) * 4], g = src[(row + sx) * 4 + 1], b = src[(row + clamp(sx - 3, 0, W - 1)) * 4 + 2];
      r = r * .97 + 6; g = g * .95 + 5; b = b * .93 + 8;   // slightly lifted blacks: contrast closer to the printed original
      if ((inBand || bottom) && rnd() > .93) r = g = b = 235;
      d[o] = r * dark; d[o + 1] = g * dark; d[o + 2] = b * dark;
    }
  }
  x.putImageData(img, 0, 0);
  x.save(); x.globalAlpha = .09; x.globalCompositeOperation = 'overlay'; const ox = hash(step) * 256, oy = hash(step, 1) * 256;
  x.fillStyle = x.createPattern(GRAIN, 'repeat'); x.translate(-ox, -oy); x.fillRect(ox, oy, W, H); x.restore();
}

function osd(t, rew) {   // VCR on-screen display + CRT corners
  x.save(); x.font = 'bold 34px Menlo, "Courier New", monospace'; x.fillStyle = '#f2f2f2'; x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowOffsetX = 3; x.shadowOffsetY = 3;
  if (rew) x.fillText('◄◄ REW', 46, 74); else if (Math.floor(t * 1.5) % 2 === 0 || t > 2) x.fillText('PLAY ►', 46, 74);
  x.fillText('SP', W - 100, 74);
  const m = Math.floor(t / 60), sec = Math.floor(t % 60);
  x.font = 'bold 30px Menlo, monospace'; x.fillText(`AM 3:${String(7 + m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`, 46, H - 100); x.fillText(S.osd_date || 'OCT.14 1988', 46, H - 62); x.restore();
  const v = x.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  x.save(); x.fillStyle = '#000'; x.beginPath(); x.rect(0, 0, W, H); x.roundRect(8, 8, W - 16, H - 16, 48); x.fill('evenodd'); x.restore();
}

function sizes(s, tq) {   // before any pose: attached layers and the beam read their target's size
  for (const l of s.layers) {
    const im = l._im = l.role === 'code' ? codeImg(l, s, tq) : IMG[l.id];
    l._s = Math.min(l.w * W / im.width, (s.word ? 0.5 : 0.8) * H / im.height); l._h = l._s * im.height / 2 * (l.role === 'hand' ? .8 : .95);
  }
  for (const l of s.layers) {   // fit: a fraction of the target's width at its paste row (paste_w); scaleOf: the same print scale as another layer
    if (l.fit) { const [tl] = tgt(s, l.fit.to); l._s = l.fit.frac * AN[tl.id].paste_w * tl._im.width * tl._s / l._im.width; }
    if (l.scaleOf) { const [tl] = tgt(s, l.scaleOf); l._s = tl._s; }
    if (l.fit || l.scaleOf) l._h = l._s * l._im.height / 2 * .95;
  }
}
function layers(s, k, tq, ex) {
  sizes(s, tq);
  s.layers.forEach((l, i) => {
    if (l.quad) return quadLayer(s, l, k, tq, ex);
    const im = l.swap && tq - s.t0 >= l.swap.t ? IMG[l.swap.id] : l._im;
    const q = l._q = pose(s, l, i, tq, k, ex); if (!q) return;
    x.save(); if (l.attach?.clip) clipAbove(s, l, tq, k, ex);
    if (l.wipe) { const f = clamp((tq - s.t0 - l.wipe[0]) / (l.wipe[1] - l.wipe[0])), sw = im.width * l._s * q.sc, sh = im.height * l._s * q.sc;
      x.translate(q.px, q.py); x.rotate(q.rot * Math.PI / 180); x.beginPath();
      if (l.wipe[2] === 'x') x.rect(-sw / 2 - 20, -sh / 2 - 20, (sw + 40) * f, sh + 40); else x.rect(-sw / 2 - 20, -sh / 2 - 20, sw + 40, (sh + 40) * f);
      x.setTransform(1, 0, 0, 1, 0, 0); x.clip(); }
    const p = pose(s, l, i, tq - STEP, k, ex ? Math.max(0, ex - STEP / EXIT) : 0);   // motion blur: ghosts along the last step's travel
    if (p && Math.hypot(q.px - p.px, q.py - p.py) > 40) for (let g = 1; g <= 3; g++) { const f = g / 4;
      drawCut(im, l, { px: p.px + (q.px - p.px) * f, py: p.py + (q.py - p.py) * f, rot: p.rot + (q.rot - p.rot) * f, sc: q.sc, alpha: q.alpha }, .22, false); }
    drawCut(im, l, q, l.alpha ?? 1, !l.wipe); x.restore();
    if (s.garland?.to.to === lid(l) && !ex) garland(s, q, tq);   // over the hand: the chain visibly reaches the pinched strip
    if (l.led && tq - s.t0 > l.at + ENTER && Math.round(tq / STEP) % 3) led(q, l);
  });
}

function led(q, l) {   // blinking red lamp on the answering machine
  x.save(); x.translate(q.px, q.py); x.rotate(q.rot * Math.PI / 180); x.fillStyle = '#ff2a2a'; x.shadowColor = '#ff0000'; x.shadowBlur = 30;
  x.beginPath(); x.arc(l.led[0] * l.w * W, l.led[1] * l.w * W, 12, 0, 7); x.fill(); x.fill(); x.restore();
}

const NEON = new Set(['bg_grid', 'bg_memphis', 'bg_night']);
function scene(s, k, tq, ex) {   // one gag at posterized time tq into the current ctx x
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.drawImage(IMG[s.bg], 0, 0, W, H);
  if (NEON.has(s.bg)) for (let j = 0; j < 3; j++) { const tw = Math.sin(tq * 9 + j * 2.1); star(hash(k, j, 1) * W, (0.1 + hash(k, j, 2) * 0.55) * H, 26 + 24 * hash(k, j, 3), clamp(.3 + .7 * tw)); }
  if (s.cable) cable(s, tq);
  if (s.phone) plate(s, tq);
  if (s.beam) { sizes(s, tq); beam(s, k, tq); }
  for (const b of s.bursts || []) if (b.kind === 'ink') burst(s.word ? { ...b, y: band(b.y) } : b, tq - s.t0 - b.t, k);   // ink lands under the stamp
  layers(s, k, tq, ex);
  for (const b of s.bursts || []) if (b.kind !== 'ink') burst(s.word ? { ...b, y: band(b.y) } : b, tq - s.t0 - b.t, k);
  if (s.gum) gum(s, tq);
  word(s, k, tq);
}

function gum(s, tq) {   // paper bubble-gum cut-out blown out of the mouth anchor during the last 0.75 s of the shot
  const u = tq - (s.t1 - 0.75); if (u < 0) return; const q = clamp(u / 0.7), r = 20 + q * q * 0.46 * W;
  let gx = s.gum[0] * W, gy = s.gum[1] * H;
  if (!Array.isArray(s.gum)) { const [tl] = tgt(s, s.gum.to); if (!tl?._q) return; [gx, gy] = world(tl, tl._q, anc(tl, s.gum.at)); }
  const im = IMG.gum_paper, sc = 2 * r / im.width;
  x.save(); x.shadowColor = 'rgba(25,8,40,.45)'; x.shadowOffsetX = 9; x.shadowOffsetY = 12;
  x.translate(gx + r * .8, gy); x.rotate((hash(Math.round(tq / STEP), 5) - .5) * .08); x.drawImage(im, -r, -im.height * sc / 2, 2 * r, im.height * sc); x.restore();
}

function shreds(k, u) {   // popped gum stuck all over the frame, sliding off
  if (u > 0.5) return; x.save();
  for (let j = 0; j < 16; j++) {
    const px = hash(k, j, 91) * W, py = hash(k, j, 92) * H + u * 500 * (0.5 + hash(k, j, 93)), r = 30 + hash(k, j, 94) * 80;
    x.globalAlpha = 1 - u / 0.5; x.strokeStyle = '#fbf7ee'; x.lineWidth = 5; x.beginPath();
    for (let a = 0; a < 9; a++) { const an = a / 9 * Math.PI * 2, rr = r * (0.6 + hash(k, j, a) * .5); a ? x.lineTo(px + Math.cos(an) * rr, py + Math.sin(an) * rr) : x.moveTo(px + Math.cos(an) * rr, py + Math.sin(an) * rr); }
    x.closePath(); x.stroke(); x.save(); x.clip(); x.drawImage(IMG.gum_paper, px - r, py - r, 2 * r, 2 * r); x.restore();   // torn bits of the paper gum
  }
  x.restore();
}

function tear(u, k) {   // the previous page (in OFF) is ripped down the middle and the halves pulled apart
  const e = clamp(u / 0.36) ** 2, pts = []; for (let y = -10; y <= H + 10; y += 40) pts.push([W / 2 + (hash(k, y, 95) - .5) * 60, y]);
  for (const side of [-1, 1]) {
    x.save(); x.translate(side * e * W * .65, e * 40); x.rotate(side * e * .12);
    x.beginPath(); x.moveTo(side < 0 ? -20 : W + 20, -10); pts.forEach(([a, b]) => x.lineTo(a, b)); x.lineTo(side < 0 ? -20 : W + 20, H + 10); x.closePath();
    x.shadowColor = 'rgba(25,8,40,.5)'; x.shadowOffsetX = 12 * side; x.shadowOffsetY = 10; x.fillStyle = '#f3ecd8'; x.fill(); x.shadowColor = 'transparent';
    x.save(); x.translate(-side * 7, 0); x.clip(); x.drawImage(OFF, side * 7, 0); x.restore(); x.restore();
  }
}

function soloMask(fn) {   // render one element alone into OFF, return its alpha>40 mask
  const X = x; x = XO; XO.setTransform(1, 0, 0, 1, 0, 0); XO.clearRect(0, 0, W, H); fn(); x = X;
  const d = XO.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H); for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 40; return m;
}

window.frame = async t => {
  const tq = Math.floor(t / STEP) * STEP, shots = S.shots;
  const k = Math.max(0, shots.findIndex((s, i) => tq >= s.t0 && tq < (shots[i + 1]?.t0 ?? 1e9)));
  const s = shots[k], pv = shots[k - 1], us = tq - s.t0;
  x = X0;
  const rew = s.trans === 'rewind' && us < 0.3;
  if (rew) scene(pv, k - 1, pv.t1 - STEP - us * 6, 0);   // tape winds back through the previous gag
  else {
    scene(s, k, tq, 0);
    if (pv && s.trans === 'tear' && us < 0.4) { x = XO; scene(pv, k - 1, pv.t1 - STEP, 0); x = X0; tear(us, k); }
    else if (pv && !s.trans && us < EXIT) layers(pv, k - 1, Math.min(tq, pv.t1 - STEP), Math.max(us / EXIT, 0.05));   // previous gag flies out: no empty frames
    if (s.trans === 'gum') shreds(k, us);
  }
  const cut = rew ? 1 : k > 0 && !s.trans && us < 0.13 ? 1 - us / 0.13 : 0;
  subs(tq);
  vhs(t, tq, cut, !!s.phone);
  osd(t, rew);
};

// Subtitles: each phrase is a typed paper strip laid in by hand at its word time; the translator's part is on a grey strip.
// Shorts button rail starts at 0.814 W: a strip centred on W/2 stays left of it if it is <= 2*(0.814-0.5) W minus a margin
const SUB_W = Math.floor(2 * (0.814 - 0.5) * W) - 36, SUB_Y = 0.745 * H;
let CH = [];
const FONTS = ['900 40px Impact, "Arial Black", sans-serif', 'bold italic 38px Georgia, "PT Serif", serif', '900 36px "Arial Black", Arial, sans-serif',
  'bold 40px "Times New Roman", "PT Serif", serif', '800 36px "PT Sans", Helvetica, sans-serif', 'bold 38px "Courier New", monospace'];
const PAPERS = [['#f4efe2', '#1d1b18'], ['#f2d64b', '#1b1a17'], ['#e9a3b6', '#1c1418'], ['#1d1b18', '#f4efe2'], ['#a9cfe0', '#16202a'], ['#d8392e', '#fbf3e4'], ['#ece6d6', '#b0271f']];
function chunks(words) {   // phrases of <= 4 words, broken on pauses and punctuation; shown from the first word to the next phrase
  const S3 = S.shots.find(s => s.voice === 'translator'), part = S3?.part ? S3.part.toLowerCase().split(/\s+/).map(w => w.replace(/[^а-яёa-z0-9]/gi, '')) : [];
  const out = []; let cur = [];
  words.forEach((w, i) => {
    const prev = words[i - 1], tr = S3 && w.s >= S3.t0 - 0.4 && w.s < S3.t1 && part.includes(w.w.toLowerCase().replace(/[^а-яёa-z0-9]/gi, ''));
    if (cur.length && (cur.map(v => v.w).join(' ').length + 1 + w.w.length > 20 || w.s - prev.e > 0.3 || /[,.!?…—]$/.test(prev.w) || cur[0].tr !== tr)) { out.push(cur); cur = []; }
    cur.push({ ...w, tr, i });
  });
  if (cur.length) out.push(cur);
  out.forEach((c, j) => c.until = Math.min(out[j + 1]?.[0].s ?? 1e9, c.at(-1).e + 0.9));
  return out;
}
function subs(tq) {   // typewriter strips: letters strike in as the word is spoken, the paper strip dances a little on the 12 fps grid
  const fin = S.shots.find(s => tq >= s.t0 && tq < s.t1 + 1);
  if (fin?.phone) {   // the finale plate already says it; instead a small printed copyright at the bottom
    const u = tq - fin.t0 - 1.2; if (u < 0) return;
    const lay = clamp(u / 0.17), L = ['Пишите: Москва, а/я', '«rocketmandrey» ©'];   // 80s mail-order address slip, laid in like the subtitles
    x.save(); x.translate(W / 2 + (1 - backOut(lay)) * -W * 0.9, SUB_Y); x.rotate(-0.02 + (1 - lay) * -0.12);
    x.font = 'bold 28px "Courier New", Courier, monospace'; const sw = Math.max(...L.map(l => x.measureText(l).width)) + 48, sh = 96;
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(-sw / 2 + 5, -sh / 2 + 6, sw, sh); x.fillStyle = '#f3eddc'; x.fillRect(-sw / 2, -sh / 2, sw, sh);
    x.fillStyle = '#111'; x.textAlign = 'center'; x.textBaseline = 'middle'; L.forEach((l, r) => x.fillText(l, 0, -20 + r * 40));
    x.restore(); return;
  }
  const c = CH.find(c => tq >= c[0].s - 0.02 && tq < c.until); if (!c) return;
  const step = Math.round(tq / STEP), tr = c[0].tr, ci = CH.indexOf(c);
  const full = c.map(w => w.w).join(' ');
  x.save(); x.font = `bold ${Math.min(tr ? 34 : 38, Math.floor((SUB_W - 44) / (full.length * 0.601)))}px "Courier New", Courier, monospace`; x.textBaseline = 'middle';   // one line: shrink to fit the centred strip
  const cw = x.measureText('M').width;
  const sw = full.length * cw + 44, sh = 74, cx = W / 2, cy = SUB_Y;   // centred on W/2, one height for every phrase
  const ph = step * 0.9 + ci * 1.7;   // slow sway of the strip
  const rot = (ci % 2 ? 1 : -1) * 0.015 + Math.sin(ph) * 0.008, dy = Math.sin(ph * 1.3) * 3;
  const u = tq - c[0].s + 0.02, lay = clamp(u / 0.17), side = ci % 2 ? 1 : -1;   // laid by hand: slides in from the side, lands with a little overshoot
  const off = (1 - backOut(lay)) * side * W * 0.9, lift = 1 + (1 - lay) * 0.08;
  x.translate(cx + off, cy + dy); x.rotate(rot + (1 - lay) * side * 0.12); x.scale(lift, lift);
  const hw = sw / 2, hh = sh / 2, e = n => (hash(ci, n, 9) - .5) * 6;
  const edge = () => { x.beginPath(); x.moveTo(-hw, -hh + e(1));   // torn top & bottom, straight cut sides
    for (let k = 1; k <= 12; k++) x.lineTo(-hw + sw * k / 12, -hh + e(k + 2)); x.lineTo(hw, hh + e(20));
    for (let k = 11; k >= 0; k--) x.lineTo(-hw + sw * k / 12, hh + e(k + 21)); x.closePath(); };
  x.fillStyle = 'rgba(0,0,0,.45)'; x.translate(5, 6); edge(); x.fill(); x.translate(-5, -6);
  x.fillStyle = tr ? '#cfcbc0' : '#f3eddc'; edge(); x.fill();
  x.strokeStyle = 'rgba(120,150,190,.35)'; x.lineWidth = 1.5;   // faint ruled lines of office paper
  x.beginPath(); x.moveTo(-hw + 10, 20); x.lineTo(hw - 10, 20); x.stroke();
  for (let g = 0; g < full.length; g++) {   // typewriter: each glyph slightly off baseline and in ink density, fixed per glyph
    x.globalAlpha = 0.72 + hash(ci, g, 3) * 0.28; x.fillStyle = tr ? '#1a1a1a' : (hash(ci, g, 5) > .97 ? '#b0271f' : '#1b1a22');
    x.fillText(full[g], -hw + 22 + g * cw, (hash(ci, g, 4) - .5) * 3);   // baseline on the strip centre
  }
  x.restore();
}
