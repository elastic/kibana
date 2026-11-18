/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Checks: APCA's minimum contrast by element width, and how noticeable a difference is between two bars.
import { lab65, type Color } from 'culori';
import type { Hex } from './types';

export type ElementKind = 'semantic' | 'nonSemantic';

// https://github.com/Myndex/SAPC-APCA/discussions/117#discussioncomment-9244796
// [Lc, min width px]. Semantic: marks that carry meaning; non-semantic: decoration.
export const NON_TEXT: Record<ElementKind, [number, number][]> = {
  semantic: [
    [15, 15],
    [20, 10],
    [25, 7],
    [30, 5.5],
    [35, 4.4],
    [40, 3.65],
    [45, 3],
    [50, 2.67],
    [55, 2.33],
    [60, 2],
    [65, 1.8],
    [70, 1.66],
    [75, 1.5],
    [80, 1.4],
    [85, 1.26],
    [90, 1],
  ],
  nonSemantic: [
    [15, 5],
    [20, 4],
    [25, 3.5],
    [30, 3],
    [35, 2.5],
    [40, 2.2],
    [45, 2],
    [50, 1.8],
    [55, 1.6],
    [60, 1.5],
    [65, 1.3],
    [70, 1.2],
    [75, 1.1],
    [80, 1],
    [90, 0.9],
  ],
};

export function requiredLc(kind: ElementKind, width: number): number | null {
  const row = NON_TEXT[kind].find(([, w]) => width >= w);
  return row ? row[0] : null;
}

// Szafir 2018, bar model. [c, d, e] per axis, Eqn 8-10.
const ND = {
  l: [0.1061, 0.0107, 0.003],
  a: [0.0895, 0.0111, 0.0037],
  b: [0.0751, 0.0113, 0.003],
} as const;
// Degrees per CSS px at 28 inches (assumed). The paper says 30 inches, but its tables map 6px to 0.25 degrees (25px per
// degree, about 15 inches); we keep a desk distance, which is the less lenient reading of the two.
const VIEWING_DISTANCE_IN = 28;
const DEG_PER_PX = (2 * Math.atan(1 / 96 / 2 / VIEWING_DISTANCE_IN) * 180) / Math.PI;
// The fit was made on bars 0.25-2 degrees thick and goes negative below that, so thinner bars count as 0.25 (the paper
// does the same for lines).
const MIN_THICKNESS_DEG = 0.25;
// Gains from elongation level off around 2:1; bars are normally longer than that.
const ELONGATION = 4;

// Multiples of the noticeable difference for bars `widthPx` thick. Takes any culori color (e.g. a simulated one).
export function pairDifference(
  hexA: Hex | Color,
  hexB: Hex | Color,
  widthPx: number,
  p = 0.8
): number {
  const t = Math.max(widthPx * DEG_PER_PX, MIN_THICKNESS_DEG);
  const [A, B] = [lab65(hexA)!, lab65(hexB)!];
  return Math.hypot(
    ...(['l', 'a', 'b'] as const).map((k) => {
      const [c, d, e] = ND[k];
      return (A[k] - B[k]) / (p / (c - d / t - e / ELONGATION));
    })
  );
}
