/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apcaLc, hexToOklch, maxChroma, oklchToHex, tintToward } from './color';
import { capChroma, correctionShare, cuspOffset, fixedChroma, hueRules } from './corrections';
import { clampL, createSolver } from './solve';
import {
  ROLES,
  type ContrastColorOptions,
  type BaseColor,
  type Color,
  type Hex,
  type Hue,
  type Oklch,
  type Palettes,
  type Params,
  type Polarity,
  type Role,
  type RoleColors,
  type Theme,
  type Toward,
} from './types';
function assemble(
  hues: Hue[],
  roleHex: (angle: number, role: Role) => Hex,
  rampHex: (angle: number, t: number) => Hex,
  neutralHex: Hex,
  lineOrder: Params['lines']['order'],
  stackPair: Params['stack']['pair']
): Palettes {
  const roles = hues.map(
    (h) =>
      ({
        name: h.name,
        angle: h.angle,
        ...Object.fromEntries(ROLES.map((k) => [k, roleHex(h.angle, k)])),
      } as RoleColors)
  );
  const angleOf = (name: string) => hues.find((h) => h.name === name)!.angle;
  const ramp = (name: string, n: number) =>
    Array.from({ length: n }, (_, k) => rampHex(angleOf(name), n > 1 ? k / (n - 1) : 1));
  return {
    roles,
    // Stack pairs: base, then muted or strong.
    intertwined: roles.flatMap((r) => [r.base, r[hueRules(r.angle).pair(stackPair)]]),
    lines:
      lineOrder === 'intertwined'
        ? roles.flatMap((r) => [r.base, r.strong])
        : [...roles.map((r) => r.base), ...roles.map((r) => r.strong)],
    sequential: ramp,
    diverging: (from, to, n) => {
      const half = (n - 1) / 2;
      const steps = Math.ceil(half);
      return Array.from({ length: n }, (_, k) => {
        const i = k - half;
        if (i === 0) return neutralHex;
        const j = Math.ceil(Math.abs(i)); // steps from the middle, 1..
        return rampHex(angleOf(i < 0 ? from : to), steps > 1 ? (j - 1) / (steps - 1) : 1);
      });
    },
  };
}

// OKLab L off the surface for the diverging middle; APCA reports 0 below about Lc 7.5.
const NEUTRAL_DL = 0.025;
// Below this chroma a surface uses the theme's neutralTint.
const ACHROMATIC = 0.005;
// Colors fade only below this Lc, so faint and the roles above it keep their chroma.
export const FADE_BELOW_LC = 5;

export type ContrastRoles = ReturnType<typeof createContrastRoles>;

// Contrast roles: each color is a hue at a role's APCA |Lc| target against the surface (as apcach, Harmonizer and
// Leonardo do), shifted by the hue's correction.
export function createContrastRoles(theme: Theme) {
  const hues: Hue[] = theme.hues.map((h) => ({
    name: h.name,
    angle: h.angle ?? hexToOklch(h.base!).h,
    anchor: h.base,
  }));

  const anchorByAngle = new Map(hues.filter((h) => h.anchor).map((h) => [h.angle, h.anchor!]));
  const farEnd = (Ls: number) =>
    Ls < 0.5 ? hexToOklch(theme.surfaces.light).L : hexToOklch(theme.surfaces.dark).L;
  const neutralTint = theme.neutralTint ? hexToOklch(theme.neutralTint) : null;
  const tintOf = (s: Oklch) => (s.C < ACHROMATIC && neutralTint ? neutralTint : s);

  // Whichever surface has more contrast with `against`. Measured with APCA rather than a luminance cutoff: its light
  // and dark polarities aren't symmetric.
  function towardFor(against: Hex): Toward {
    const { light, dark } = theme.surfaces;
    return Math.abs(apcaLc(light, against)) >= Math.abs(apcaLc(dark, against)) ? 'light' : 'dark';
  }

  // What to solve toward: the far end, with polarity true the surface towardFor picks, or the one given.
  function endFor(Ls: number, against: Hex, polarity: Polarity) {
    if (polarity === false) return farEnd(Ls);
    return hexToOklch(theme.surfaces[polarity === true ? towardFor(against) : polarity]).L;
  }

  const solveLightness = createSolver();

  // L0: where the hue hits the base target. L − L0 is the hue's correction.
  function baseColor(angle: number, surface: Hex, p: Params): BaseColor {
    const Ls = hexToOklch(surface).L;
    const ceil = p.chroma.ceiling;

    const L0 = solveLightness({
      angle,
      target: p.lc.base,
      against: surface,
      from: Ls,
      to: farEnd(Ls),
      chromaAt: (L) => fixedChroma(angle, L, ceil),
      key: `base|${ceil}`,
    });

    const anchor = p.base.from === 'anchor' && anchorByAngle.get(angle);

    const quiet = hueRules(angle).baseChroma(Ls);

    if (anchor) {
      const { L, C } = hexToOklch(anchor);
      if (quiet === 1) return { hex: anchor, L, L0, C, h: angle };
      return { hex: oklchToHex(L, C * quiet, angle), L, L0, C: C * quiet, h: angle };
    }

    const L = clampL(L0 + cuspOffset(angle, p));
    const C = fixedChroma(angle, L, ceil) * quiet;
    return { hex: oklchToHex(L, C, angle), L, L0, C, h: angle };
  }

  // Fades chroma and hue into the background, reaching it at Lc 0; the solver handles lightness. Without it, colors
  // fade to gray, which doesn't match dark's blue surface. Squared, so targets just below keep most of their chroma.
  function fadeIntoAgainst(color: Color, target: number, against: Hex): Color {
    const share = Math.max(0, 1 - Math.abs(target) / FADE_BELOW_LC) ** 2;
    if (share === 0) return color;
    const { L, C, h } = tintToward(color, against, share);
    return { hex: oklchToHex(L, C, h), L, C, h };
  }

  // angle null: a gray in the surface's tint at the tint's chroma, as the diverging middle. No hue, so no base, no
  // correction and no hue rules; fixedC and strict don't apply.
  function contrastColor(
    angle: number | null,
    target: number,
    surface: Hex,
    p: Params,
    {
      against = surface,
      fixedC = null,
      strict = false,
      polarity = false,
      exact = false,
    }: ContrastColorOptions = {}
  ): Color {
    return fadeIntoAgainst(
      solveContrastColor(angle, target, surface, p, { against, fixedC, strict, polarity, exact }),
      target,
      against
    );
  }

  function solveContrastColor(
    angle: number | null,
    target: number,
    surface: Hex,
    p: Params,
    { against, fixedC, strict, polarity, exact }: Required<ContrastColorOptions>
  ): Color {
    const Ls = hexToOklch(surface).L;
    const end = endFor(Ls, against, polarity);
    const from = against === surface ? Ls : hexToOklch(against).L;

    if (angle === null) {
      const tint = tintOf(hexToOklch(surface));
      const chromaAt = (L: number) => fixedChroma(tint.h, L, tint.C);
      const L = solveLightness({
        angle: tint.h,
        target,
        against,
        from,
        to: end,
        chromaAt,
        key: `neutral|${tint.C}`,
      });
      return { hex: oklchToHex(L, chromaAt(L), tint.h), L, C: chromaAt(L), h: tint.h };
    }

    const flipped = end !== farEnd(Ls);
    const base = baseColor(angle, surface, p);

    const { hueAt } = hueRules(angle);
    const h = (L: number) => hueAt(L, base.L, Ls);

    const chromaAt =
      fixedC === null
        ? (L: number) => capChroma(h(L), L, target, base, p)
        : (L: number) => fixedChroma(h(L), L, fixedC);

    const L0 = solveLightness({
      angle,
      hueAt: h,
      target,
      against,
      from,
      to: end,
      chromaAt,
      key: `${base.C}|${base.L}|${p.chroma.taper}|${p.chroma.taperDark}|${p.lc.base}|${fixedC}`,
    });

    // From `from`, so a mark just off a fill gets little correction, like one just off the surface.
    const share = flipped || exact ? 0 : correctionShare(L0, from, end, base.L0);
    // Up to `from`, so faint colors can step off white.
    const corrected = clampL(L0 + (base.L - base.L0) * share, from);
    const towardBackground = Math.sign(corrected - L0) === Math.sign(from - L0);
    const L = strict && towardBackground ? L0 : corrected;
    const C = chromaAt(L);

    return { hex: oklchToHex(L, C, h(L)), L, C, h: h(L) };
  }

  function evenChroma(
    target: number,
    surface: Hex,
    p: Params,
    againstFor: (angle: number) => Hex = () => surface
  ) {
    const untapered = { ...p, chroma: { ...p.chroma, taper: 0 } };
    const max = hues.map((h) =>
      maxChroma(
        contrastColor(h.angle, target, surface, untapered, { against: againstFor(h.angle) }).L,
        h.angle
      )
    );
    return Math.min(p.chroma.ceiling, ...max);
  }

  function neutralColor(surface: Hex): Hex {
    const s = hexToOklch(surface);
    const L = clampL(s.L + Math.sign(farEnd(s.L) - s.L) * NEUTRAL_DL);
    const tint = tintOf(s);
    return oklchToHex(L, tint.C, tint.h);
  }

  function neutralRoles(surface: Hex, p: Params): Record<Role, Hex> {
    const at = (target: number, against: Hex) =>
      contrastColor(null, target, surface, p, { against }).hex;
    const faint = at(p.lc.faint, surface);
    return {
      faint,
      muted: at(p.lc.muted, surface),
      base: at(p.lc.base, surface),
      strong: at(p.lc.strong, surface),
      ink: at(p.lc.ink, faint),
    };
  }

  // The role color for any hue angle on a surface. In 'even' mode, every role's chroma is shared across the theme's hues.
  function roleResolver(surface: Hex, p: Params) {
    const even = p.chroma.mode === 'even';

    const Ls = hexToOklch(surface).L;

    // Faint, also what ink is measured against.
    const faintHex = (angle: number, C: number | null) => {
      const cap = hueRules(angle).faintChroma(Ls);
      return contrastColor(angle, p.lc.faint, surface, p, {
        fixedC: cap === null ? C : Math.min(C ?? cap, cap),
      }).hex;
    };

    const evenC: Partial<Record<Role, number>> = {};
    if (even) {
      for (const k of ['faint', 'muted', 'strong'] as const)
        evenC[k] = evenChroma(p.lc[k], surface, p);
      evenC.ink = evenChroma(p.lc.ink, surface, p, (angle) => faintHex(angle, evenC.faint!));
    }

    const role = (angle: number, k: Role) => {
      if (k === 'base') return baseColor(angle, surface, p).hex;
      const C = even ? evenC[k]! : null;
      if (k === 'faint') return faintHex(angle, C);

      // A shared muted is light's, on both surfaces.
      if (k === 'muted' && hueRules(angle).sharedMuted) {
        const light = theme.surfaces.light;
        return contrastColor(angle, p.lc.muted, light, p, {
          fixedC: even ? evenChroma(p.lc.muted, light, p) : null,
        }).hex;
      }
      if (k !== 'ink') return contrastColor(angle, p.lc[k], surface, p, { fixedC: C }).hex;

      // Ink is measured against faint.
      return contrastColor(angle, p.lc.ink, surface, p, {
        against: faintHex(angle, even ? evenC.faint! : null),
        fixedC: C,
        strict: true,
      }).hex;
    };
    return role;
  }

  // Every role at a hue angle, not only the theme's hues.
  function rolesAt(angle: number, surface: Hex, p: Params): Record<Role, Hex> {
    const role = roleResolver(surface, p);
    return Object.fromEntries(ROLES.map((k) => [k, role(angle, k)])) as Record<Role, Hex>;
  }

  function palettes(surface: Hex, p: Params): Palettes {
    const even = p.chroma.mode === 'even';
    const role = roleResolver(surface, p);

    const rampC: Record<number, number> = {};
    const ramp = (angle: number, t: number) => {
      const target = p.ramp.from + (p.ramp.to - p.ramp.from) * t;

      if (target === p.lc.base) return baseColor(angle, surface, p).hex;
      if (even && !(target in rampC)) rampC[target] = evenChroma(target, surface, p);

      return contrastColor(angle, target, surface, p, { fixedC: even ? rampC[target] : null }).hex;
    };
    return assemble(hues, role, ramp, neutralColor(surface), p.lines.order, p.stack.pair);
  }

  return {
    hues,
    hueNames: hues.map((h) => h.name),
    hueAngle: (name: string) => hues.find((h) => h.name === name)!.angle,
    baseColor,
    contrastColor,
    neutralRoles,
    palettes,
    rolesAt,
  };
}
