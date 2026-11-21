/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { maxChroma, shell } from './color';
import type { BaseColor, HueRules, Params } from './types';
import { isYellow, yellowRules } from './yellow';

// Per-hue exceptions to the system. Every hue follows the plain rules; yellow is the only one with its own (yellow.ts).
const plainRules = (angle: number): HueRules => ({
  hueAt: () => angle,
  baseChroma: () => 1,
  faintChroma: () => null,
  sharedMuted: false,
  pair: (pair) => pair,
});

export const hueRules = (angle: number): HueRules =>
  isYellow(angle) ? yellowRules(angle) : plainRules(angle);

// Hue correction Δ = L(base) − L(at the base target); other roles get a share. High-cusp hues (teal, yellow) read as
// themselves only when light.

// For hues without an anchor; only high-cusp hues are lifted.
export const cuspOffset = (angle: number, { base }: Params) =>
  base.cuspPull * Math.max(0, shell(angle).cuspL - base.cuspRef);

// Share of the correction: 1 at base, linear to 0 at the surface and the far end.
export function correctionShare(L0: number, Ls: number, end: number, Lb0: number) {
  const toward = (L0 - Ls) / (Lb0 - Ls);
  const away = (end - L0) / (end - Lb0);
  return Math.max(0, Math.min(1, toward, away));
}

// Role chroma. 'cap': capped by base's, tapering toward the surface and white. 'even' (Harmonizer): one chroma per
// role across hues, computed in contrast_roles.ts.
export function capChroma(angle: number, L: number, target: number, base: BaseColor, p: Params) {
  const share = Math.min(1, target / p.lc.base, L > base.L ? (1 - L) / (1 - base.L) : 1);
  const exponent = L < base.L ? p.chroma.taperDark : p.chroma.taper;
  return Math.min(maxChroma(L, angle), base.C * Math.max(0, share) ** exponent);
}

export const fixedChroma = (angle: number, L: number, C: number) =>
  Math.min(maxChroma(L, angle), C);
