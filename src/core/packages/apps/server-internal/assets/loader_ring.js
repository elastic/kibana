/*
 * <elastic-loader-ring> — dependency-free version of EuiLoaderRing.
 * Same animation engine as loader_ring.tsx. Works in any page, with or without a framework.
 *
 *   <script src="loader-ring.js"></script>
 *   <elastic-loader-ring mode="sweep" size="120"></elastic-loader-ring>
 *   ...
 *   document.querySelector('elastic-loader-ring').loading = false; // settle
 *
 * Attributes (and matching properties): mode, loading, size, thickness, sweep-speed, pulse-speed, label.
 * `loading` is true unless the attribute is set to "false" (or the property to false).
 */
(function () {
  if (typeof window === 'undefined' || customElements.get('elastic-loader-ring')) return;

  var LOGO_PATH = 'M60.6368 42.3681C62.8721 41.7487 65.2525 41.9145 67.3799 42.8388C69.51 43.7649 71.2596 45.3919 72.3379 47.4491C73.4184 49.5094 73.7651 51.8766 73.3204 54.1601C74.695 54.6586 75.8818 55.5707 76.7178 56.7704C77.556 57.9714 78.0037 59.4015 78 60.8661C77.9928 62.3368 77.5364 63.7701 76.6924 64.9745C75.8503 66.1765 74.6603 67.0916 73.2823 67.5966C73.6838 68.6996 73.717 69.9035 73.378 71.0272C73.0389 72.151 72.3449 73.135 71.4004 73.8319C70.4567 74.5254 69.3127 74.8928 68.1416 74.8778C66.9703 74.8628 65.8351 74.4666 64.9092 73.7489C63.6606 75.4996 61.8876 76.8087 59.8467 77.4862C57.8078 78.1627 55.606 78.1713 53.5616 77.5116C51.5152 76.8501 49.7319 75.5547 48.4698 73.8134C47.2049 72.0691 46.5251 69.969 46.5274 67.8143C46.5271 67.1634 46.5871 66.5137 46.7071 65.8739C45.3247 65.3785 44.13 64.4659 43.2881 63.2626C42.4446 62.0566 41.9947 60.6191 42 59.1474C42.0077 57.6766 42.4644 56.2433 43.3086 55.039C44.1519 53.8368 45.3435 52.922 46.7227 52.4179C46.3155 51.3143 46.277 50.1076 46.6133 48.9804C46.9497 47.8533 47.6428 46.8659 48.5879 46.1659C49.5324 45.4689 50.6788 45.099 51.8526 45.1132C53.0263 45.1274 54.1636 45.5244 55.0909 46.244C56.4427 44.3567 58.3998 42.9891 60.6368 42.3681ZM47.9991 65.8798L48 65.8817C47.7511 67.1069 47.7606 68.3708 48.0293 69.5917C48.2981 70.8126 48.8193 71.9642 49.5596 72.9716C50.6894 74.5081 52.2835 75.6406 54.1055 76.204C55.9253 76.7659 57.8775 76.7285 59.6739 76.0956C61.473 75.4614 63.0214 74.2661 64.0909 72.6864L65.4024 65.8222L63.6534 62.4638L55.7442 58.8515L47.9991 65.8798ZM65.4825 72.6864C66.2179 73.2572 67.1218 73.5676 68.0528 73.5692C68.739 73.5675 69.4151 73.4003 70.0225 73.0809C70.6297 72.7617 71.1506 72.3002 71.5411 71.7362C71.9337 71.1714 72.1852 70.5199 72.2735 69.8378C72.3617 69.1557 72.2847 68.4624 72.0489 67.8163L66.6485 66.5507L65.4825 72.6864ZM65.004 62.1073L66.5791 65.1337L72.5196 66.5263C73.7059 66.1248 74.737 65.362 75.4688 64.3456C76.2023 63.3275 76.6007 62.1063 76.6084 60.8515C76.6081 59.6424 76.2411 58.4618 75.5557 57.4657C74.8714 56.4709 73.9001 55.7074 72.7715 55.2782L65.004 62.1073ZM47.4815 53.4911C46.3129 53.8782 45.2925 54.6178 44.5616 55.6083C43.829 56.6004 43.4203 57.7943 43.3916 59.0272C43.3631 60.2603 43.7164 61.4719 44.4024 62.497C45.0874 63.5206 46.0713 64.3082 47.2198 64.747L54.795 57.8837L53.4053 54.9022L47.4815 53.4911ZM65.8956 43.8622C64.0835 43.299 62.1381 43.3329 60.3467 43.9589C58.5529 44.586 57.0071 45.7716 55.9366 47.3417L54.6163 54.2245L56.1534 57.5087L56.1524 57.5106L64.0303 61.1229L71.9795 54.1327C72.0946 53.5562 72.1519 52.9696 72.1504 52.3817C72.1512 50.4784 71.5441 48.6241 70.418 47.0897C69.2945 45.5582 67.7091 44.4269 65.8956 43.8622ZM51.9844 46.4579C51.0643 46.4532 50.1671 46.747 49.4278 47.2948C48.6884 47.8456 48.1457 48.62 47.8799 49.5028C47.6141 50.3857 47.6388 51.3307 47.9512 52.1981L47.9493 52.2001L53.3487 53.4794L54.5323 47.3212C53.7985 46.7658 52.9047 46.4626 51.9844 46.4579Z';
  var R = 55.5;
  var C = 2 * Math.PI * R;
  var SEGS = [[0, 72], [72, 201.6], [201.6, 239], [239, 289], [289, 360]];
  var SEG_COLORS = ['#FEC514', '#48EFCF', '#0B64DD', '#FF957D', '#F04E98'];
  var BASE = SEGS.map(function (s) { return (s[1] - s[0] + 72) / 2; });
  var SETTLE_S = 0.6;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function easeInOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function smoothstep(x) { return x * x * (3 - 2 * x); }
  function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }

  function Engine() {
    this.t0 = null;
    this.mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.lastS = null; this.sLock = false; this.sMix = 0; this.sClk = 0; this.sResume = false;
    this.sFixedCi = null; this.prevLay = null; this.sRot = 0; this.sOff = 0;
    this.sweepCi = null; this.sweepSeg = null; this.sweepR = []; this.sweepLay = null;
    this.last = null; this.pLock = false; this.mix = 0; this.intro = 0; this.clk = 0;
    this.steps = new Map();
    this.settle = {
      s: { hold: 0, from: null, target: 0, em0: 0, out: null, prevL: true },
      p: { hold: 0, from: null, target: 0, em0: 0, out: null, prevL: true }
    };
  }

  Engine.prototype.tick = function (now, p, el, segs) {
    if (this.t0 == null) this.t0 = now;
    var reduce = this.mql.matches;
    var mode = p.mode;
    var period = Math.max(0.3, mode === 'sweep' ? p.sweepSpeed : p.pulseSpeed) * 1000;
    var t = (now - this.t0) / period;
    var rot = reduce ? 0 : (t % 1) * 360;
    var tail = 0, head = 360, sEm = 0, sRotOut = 0, sGf = 0, prevTail = null;

    if (mode === 'sweep' && !reduce) {
      var dtS = Math.min(0.05, (now - (this.lastS == null ? now : this.lastS)) / 1000); this.lastS = now;
      if (!p.loading) this.sLock = true;
      if (p.loading && this.sLock && this.sMix >= 1) { this.sLock = false; this.sResume = true; }
      var loadingS = p.loading && !this.sLock;
      this.sMix = clamp(this.sMix + (loadingS ? -dtS : dtS) / SETTLE_S, 0, 1);
      sEm = smoothstep(this.sMix);
      this.sClk += dtS * (1 - sEm);
      if (this.sResume) {
        this.sResume = false;
        var rci = Math.floor(this.sClk / (period / 1000) / 2);
        this.sClk = (2 * rci + 1) * period / 1000;
        this.sFixedCi = rci; this.prevLay = null;
      }
      t = this.sClk / (period / 1000);
      var cyc = (t / 2) % 1;
      var HOLD = 0.12, OV = 0.2, fEnd = 0.5 - HOLD / 2, eStart = 0.5 + HOLD / 2;
      this.newSweepCycle(Math.floor(t / 2));
      if (cyc < fEnd) head = easeInOutCubic(cyc / fEnd) * 360;
      else if (cyc >= eStart) tail = easeInOutCubic((cyc - eStart) / (1 + OV - eStart)) * 360;
      if (cyc < OV && this.prevLay) {
        prevTail = easeInOutCubic((cyc + 1 - eStart) / (1 + OV - eStart)) * 360;
        prevTail += (360 - prevTail) * sEm;
      }
      sGf = cyc < fEnd ? smoothstep(clamp((head / 360 - 0.9) / 0.1, 0, 1)) : 1;
      var vis = clamp(((head - tail) / 360 - 0.8) / 0.2, 0, 1);
      var v = 1 - 0.75 * smoothstep(vis);
      this.sRot += dtS * 360 / (period / 1000) * v * (1 - sEm);
      sRotOut = this.settleRot('s', this.sRot + this.sOff + 30 * sGf, sEm, loadingS);
      if (tail > 0) head = 360 + tail * sEm;
      else head = head + (360 - head) * sEm;
    }

    if (mode !== 'sweep' && !reduce) { this.pulseFrame(now, p, period, el, segs); return; }

    el.style.transform = 'rotate(' + (mode === 'sweep' && !reduce ? sRotOut : rot) + 'deg)';
    this.newSweepCycle(Math.floor(t / 2));
    var n = this.sweepSeg, gr = 30 * sGf, lay = [], pos = 216 - gr;
    lay[n] = [0, 216 - gr];
    this.sweepR.forEach(function (len, k) { var l = len * (144 + gr) / 144; lay[(n + 1 + k) % 5] = [pos, pos + l]; pos += l; });
    this.sweepLay = this.sFixedCi === this.sweepCi ? SEGS.map(function (x) { return x.slice(); }) : lay;

    var LAY = mode === 'sweep' && !reduce
      ? this.sweepLay.map(function (ab, i) { return [ab[0] + (SEGS[i][0] - ab[0]) * sEm, ab[1] + (SEGS[i][1] - ab[1]) * sEm]; })
      : SEGS;
    function cut(ab, tl, hd) {
      var out = [];
      [0, -360, 360].forEach(function (sh) {
        var s = Math.max(ab[0], tl + sh), e = Math.min(ab[1], hd + sh);
        if (e <= s) return;
        if (s >= 360) out.push([s - 360, e - 360]);
        else if (e > 360) { out.push([s, 360]); out.push([0, e - 360]); }
        else out.push([s, e]);
      });
      return out.filter(function (x) { return x[1] > x[0]; });
    }
    var usePrev = mode === 'sweep' && !reduce && prevTail != null && !!this.prevLay;
    var prevLay = this.prevLay;
    LAY.forEach(function (seg, i) {
      var c = segs[i];
      var pieces = cut(seg, tail, head).concat(usePrev ? cut(prevLay[i], prevTail, 360) : [])
        .sort(function (x, y) { return x[0] - y[0]; });
      var arr = [0], cur = 0;
      pieces.forEach(function (se) { arr.push((se[0] - cur) / 360 * C, (se[1] - se[0]) / 360 * C); cur = se[1]; });
      arr.push(C);
      c.setAttribute('stroke-dasharray', arr.join(' '));
      c.setAttribute('stroke-dashoffset', '0');
    });
  };

  Engine.prototype.pulseFrame = function (now, p, period, el, segs) {
    var self = this;
    var dt = Math.min(0.05, (now - (this.last == null ? now : this.last)) / 1000); this.last = now;
    if (!p.loading) this.pLock = true;
    if (p.loading && this.pLock && this.mix >= 1) this.pLock = false;
    var loading = p.loading && !this.pLock;
    this.mix = clamp(this.mix + (loading ? -dt : dt) / SETTLE_S, 0, 1);
    var em = smoothstep(this.mix);
    this.intro = Math.min(1, this.intro + dt / 0.45);
    var pHead = (1 - Math.pow(1 - this.intro, 3)) * 360;
    this.clk += dt * (1 - em);
    var t = this.clk / (period / 1000) * 1.05;
    var f = t % 1, n = 1.8;
    var T = Math.floor(t) + Math.pow(f, n) / (Math.pow(f, n) + Math.pow(1 - f, n));
    var g2 = (t + 0.5) % 1, m = 2;
    var G = Math.floor(t + 0.5) + Math.pow(g2, m) / (Math.pow(g2, m) + Math.pow(1 - g2, m));
    function step(j) {
      if (!self.steps.has(j)) {
        var prev = self.steps.get(j - 1), prev2 = self.steps.get(j - 2);
        var c = Math.floor(Math.random() * 5);
        if (prev) {
          var opts = [(prev.c + 2) % 5, (prev.c + 3) % 5];
          var fresh = opts.filter(function (o) { return !prev2 || o !== prev2.c; });
          c = fresh.length === 1 && Math.random() > 0.15 ? fresh[0] : opts[Math.random() < 0.5 ? 0 : 1];
        }
        self.steps.set(j, { c: c, a: 1.3 + Math.random() * 1.7 });
        if (self.steps.size > 12) self.steps.delete(self.steps.keys().next().value);
      }
      return self.steps.get(j);
    }
    var gj = Math.floor(G);
    [gj - 2, gj - 1, gj, gj + 1].forEach(step);
    var g = [0, 0, 0, 0, 0];
    function capOf(i) { return 1.5 * 0.55 * (360 - BASE[i]) / BASE[i] - 0.55; }
    [gj - 2, gj - 1, gj].forEach(function (j) {
      var d = G - (j + 1);
      var env = d < 0 ? (d > -1 ? Math.pow(Math.cos(Math.PI * d / 2), 2) : 0) : d < 2 ? Math.pow(Math.cos(Math.PI * d / 4), 2) : 0;
      if (env > 0) { var st = step(j); g[st.c] += capOf(st.c) * (0.7 + 0.3 * (st.a - 1.3) / 1.7) * env; }
    });
    var wp = BASE.map(function (b, i) { return b * (0.55 + Math.min(g[i], capOf(i))); });
    var kp = 360 / wp.reduce(function (x, y) { return x + y; }, 0);
    var w = wp.map(function (x, i) { return x * kp * (1 - em) + (SEGS[i][1] - SEGS[i][0]) * em; });
    var S = [], acc = 0;
    w.forEach(function (wi) { S.push(acc); acc += wi; });
    var nT = Math.floor(t), eT = T - nT;
    var s0 = S[step(nT).c], s1 = S[step(nT + 1).c];
    var F = s0 + ((((s1 - s0) % 360) + 360) % 360) * eT;
    el.style.transform = 'rotate(' + this.settleRot('p', T * 378 - F, em, loading) + 'deg)';
    var s = 0;
    w.forEach(function (wi, i) {
      var len = Math.max(0, Math.min(s + wi, pHead) - s);
      segs[i].setAttribute('stroke-dasharray', (len / 360 * C) + ' ' + C);
      segs[i].setAttribute('stroke-dashoffset', String(-s / 360 * C));
      s += len;
    });
  };

  Engine.prototype.settleRot = function (key, base, em, loading) {
    var st = this.settle[key], out;
    if (!loading) {
      if (st.prevL || st.from == null) {
        st.from = st.out != null ? st.out : base + st.hold;
        st.hold = st.from - base;
        st.target = Math.ceil((st.from + 120) / 360) * 360;
        st.em0 = em;
      }
      var f = st.em0 >= 1 ? 1 : Math.max(0, (em - st.em0) / (1 - st.em0));
      out = (base + st.hold) * (1 - f) + st.target * f;
    } else {
      if (!st.prevL && st.out != null) st.hold = st.out - base;
      out = base + st.hold;
    }
    st.prevL = loading; st.out = out;
    return ((out % 360) + 360) % 360;
  };

  Engine.prototype.newSweepCycle = function (ci) {
    if (this.sweepCi === ci) return;
    if (this.sweepCi != null && this.sweepLay) { this.prevLay = this.sweepLay; this.sOff += 30; }
    var n;
    do { n = Math.floor(Math.random() * 5); }
    while (this.sweepSeg != null && (n === this.sweepSeg || n === (this.sweepSeg + 4) % 5));
    this.sweepCi = ci; this.sweepSeg = n;
    var r = [1, 2, 3, 4].map(function () { return 0.4 + Math.random() * 1.4; });
    var rs = r.reduce(function (x, y) { return x + y; }, 0);
    this.sweepR = r.map(function (x) { return x / rs * 144; });
  };

  class ElasticLoaderRing extends HTMLElement {
    static get observedAttributes() { return ['mode', 'loading', 'size', 'thickness', 'sweep-speed', 'pulse-speed', 'label']; }

    constructor() {
      super();
      var root = this.attachShadow({ mode: 'open' });
      root.innerHTML =
        '<style>:host{display:inline-block;position:relative;line-height:0;vertical-align:middle}' +
        'svg{display:block;overflow:visible;width:100%;height:100%}' +
        '.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
        '.ring{transform-origin:60px 60px;opacity:1;transition:opacity 250ms ease}' +
        ':host([exiting]) .ring{opacity:0}' +
        '.mark{fill:var(--elastic-loader-ring-mark,#1C1E23);opacity:1;transition:opacity 250ms ease}' +
        ':host([exiting-mark]) .mark{opacity:0}</style>';
      var svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', '0 0 120 120');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('aria-hidden', 'true');
      var g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'ring');
      this._segs = SEGS.map(function (ab, i) {
        var c = document.createElementNS(SVGNS, 'circle');
        c.setAttribute('cx', '60'); c.setAttribute('cy', '60'); c.setAttribute('r', String(R));
        c.setAttribute('stroke', SEG_COLORS[i]);
        c.setAttribute('stroke-dasharray', ((ab[1] - ab[0]) / 360 * C) + ' ' + C);
        c.setAttribute('stroke-dashoffset', String(-ab[0] / 360 * C));
        g.appendChild(c);
        return c;
      });
      var mark = document.createElementNS(SVGNS, 'path');
      mark.setAttribute('class', 'mark');
      mark.setAttribute('fill-rule', 'evenodd'); mark.setAttribute('clip-rule', 'evenodd');
      mark.setAttribute('d', LOGO_PATH);
      svg.appendChild(g); svg.appendChild(mark);
      this._label = document.createElement('span');
      this._label.className = 'sr';
      root.appendChild(svg); root.appendChild(this._label);
      this._ring = g;
      this._raf = 0;
    }

    connectedCallback() {
      this.setAttribute('role', 'status');
      this.setAttribute('aria-live', 'polite');
      this._render();
      this._engine = new Engine();
      var self = this;
      var tick = function (now) {
        self._raf = requestAnimationFrame(tick);
        self._engine.tick(now, self._frameProps(), self._ring, self._segs);
      };
      this._raf = requestAnimationFrame(tick);
    }

    disconnectedCallback() { cancelAnimationFrame(this._raf); }

    attributeChangedCallback() { if (this._ring) this._render(); }

    _frameProps() {
      return {
        mode: this.mode,
        loading: this.loading,
        sweepSpeed: clamp(num(this.getAttribute('sweep-speed'), 1.1), 0.8, 1.4),
        pulseSpeed: clamp(num(this.getAttribute('pulse-speed'), 0.8), 0.6, 1.2)
      };
    }

    _render() {
      var px = clamp(num(this.getAttribute('size'), 120), 64, 240);
      var sw = clamp(num(this.getAttribute('thickness'), 5), 3, 8);
      this.style.width = px + 'px';
      this.style.height = px + 'px';
      this._segs.forEach(function (c) { c.setAttribute('stroke-width', String(sw)); });
      this._label.textContent = this.getAttribute('label') || 'Loading';
      this.setAttribute('aria-busy', String(this.loading));
    }

    get mode() { return this.getAttribute('mode') === 'pulse' ? 'pulse' : 'sweep'; }
    set mode(v) { this.setAttribute('mode', v); }
    get loading() { return this.getAttribute('loading') !== 'false'; }
    set loading(v) { this.setAttribute('loading', v ? 'true' : 'false'); }
    get size() { return num(this.getAttribute('size'), 120); }
    set size(v) { this.setAttribute('size', String(v)); }
    get thickness() { return num(this.getAttribute('thickness'), 5); }
    set thickness(v) { this.setAttribute('thickness', String(v)); }
    get sweepSpeed() { return num(this.getAttribute('sweep-speed'), 1.1); }
    set sweepSpeed(v) { this.setAttribute('sweep-speed', String(v)); }
    get pulseSpeed() { return num(this.getAttribute('pulse-speed'), 0.8); }
    set pulseSpeed(v) { this.setAttribute('pulse-speed', String(v)); }

    // Settle + fade colored ring; centre mark stays until exitMark().
    exit() {
      this.loading = false;
      this.setAttribute('exiting', '');
      this.setAttribute('aria-busy', 'false');
    }

    exitMark() {
      this.setAttribute('exiting-mark', '');
    }
  }

  customElements.define('elastic-loader-ring', ElasticLoaderRing);
})();
