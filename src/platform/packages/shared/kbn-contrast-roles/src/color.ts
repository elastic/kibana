/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ColorSpace, contrastAPCA, sRGB } from 'colorjs.io/fn';
import { formatHex, lrgb, oklch, rgb, wcagContrast } from 'culori';
import type { Hex, Oklch } from './types';

ColorSpace.register(sRGB);

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const toCulori = (L: number, C: number, h: number) => ({ mode: 'oklch' as const, l: L, c: C, h });

function oklchToLinear(L: number, C: number, h: number): [number, number, number] {
  const { r, g, b } = lrgb(toCulori(L, C, h));
  return [r, g, b];
}

export function oklchToRgb255(L: number, C: number, h: number): [number, number, number] {
  const { r, g, b } = rgb(toCulori(L, C, h));
  return [r, g, b].map((v) => Math.round(255 * clamp(v, 0, 1))) as [number, number, number];
}

export function hexToRgb255(hex: Hex): [number, number, number] {
  const { r, g, b } = rgb(hex)!;
  return [r, g, b].map((v) => Math.round(255 * v)) as [number, number, number];
}

export const oklchToHex = (L: number, C: number, h: number): Hex =>
  formatHex(toCulori(L, C, h)).toUpperCase();

export function hexToOklch(hex: Hex): Oklch {
  const { l, c, h } = oklch(hex)!;
  return { L: l, C: c, h: h ?? 0 };
}

// Tight on purpose: a loose tolerance once broke teal's cusp near black.
const GAMUT_TOLERANCE = 1e-7;
const inGamut = (v: number[]) => v.every((x) => x >= -GAMUT_TOLERANCE && x <= 1 + GAMUT_TOLERANCE);

function maxChromaExact(L: number, h: number) {
  if (L <= 0 || L >= 1) return 0;
  let lo = 0;
  let hi = 0.4; // 0.4 is above any sRGB chroma
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinear(L, mid, h))) lo = mid;
    else hi = mid;
  }
  return lo;
}

// Max chroma per lightness step, like nutelch's LUT.
export const SHELL_STEPS = 200;
interface Shell {
  table: number[];
  cuspL: number;
  cuspC: number;
}
const shellCache = new Map<number, Shell>();
export function shell(h: number): Shell {
  const key = Math.round(h * 10) / 10;
  if (!shellCache.has(key)) {
    const table: number[] = [];
    let cusp = 0;
    for (let i = 0; i <= SHELL_STEPS; i++) {
      table.push(maxChromaExact(i / SHELL_STEPS, key));
      if (table[i] > table[cusp]) cusp = i;
    }
    shellCache.set(key, { table, cuspL: cusp / SHELL_STEPS, cuspC: table[cusp] });
  }
  return shellCache.get(key)!;
}

export function maxChroma(L: number, h: number) {
  const { table } = shell(h);
  const f = clamp(L, 0, 1) * SHELL_STEPS;
  const i = Math.min(SHELL_STEPS - 1, Math.floor(f));
  return table[i] + (table[i + 1] - table[i]) * (f - i);
}

export const contrast = (a: Hex, b: Hex) => wcagContrast(a, b);
export const apcaLc = (fg: Hex, bg: Hex): number => contrastAPCA(bg, fg);
