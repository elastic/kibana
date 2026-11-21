/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apcaLc, oklchToHex } from './color';
import type { Hex } from './types';

const L_MIN = 0.03;
const L_MAX = 0.985;
export const clampL = (L: number) => Math.min(L_MAX, Math.max(L_MIN, L));

const ITERATIONS = 30;
const CACHE_LIMIT = 20000;

// APCA reports 0 below |Lc| 7.3 (loClip 0.1 minus the 0.027 offset), so lower targets can't be bisected for. They
// get lightness linearly between the background and where Lc 7.3 is reached.
const APCA_FLOOR = 7.3;

interface LightnessQuery {
  angle: number; // hue
  hueAt?: (L: number) => number; // the hue at each candidate lightness, when it turns with lightness
  target: number; // |Lc| to reach
  against: Hex; // what contrast is measured against
  from: number; // lightness to start at (the background's)
  to: number; // lightness to move toward (the far end)
  chromaAt: (L: number) => number; // the color's chroma at each candidate lightness
  key: string; // identifies chromaAt for the cache
}

// Contrast grows monotonically from `from` to `to`.
export function createSolver() {
  const cache = new Map<string, number>();
  return function solveLightness(query: LightnessQuery): number {
    const { angle, hueAt, target, against, from, to, chromaAt, key } = query;
    if (target < APCA_FLOOR) {
      // chromaAt may depend on the original target, so it stays in the key.
      const floor = solveLightness({ ...query, target: APCA_FLOOR, key: `${key}|below ${target}` });
      return from + (floor - from) * (Math.max(0, target) / APCA_FLOOR);
    }
    const k = [angle, target, against, from, to, key].join('|');
    const hit = cache.get(k);
    if (hit !== undefined) return hit;
    const at = (t: number) => clampL(from + (to - from) * t);
    const lcAt = (L: number) =>
      Math.abs(apcaLc(oklchToHex(L, chromaAt(L), hueAt?.(L) ?? angle), against));
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < ITERATIONS; i++) {
      const mid = (lo + hi) / 2;
      if (lcAt(at(mid)) < target) lo = mid;
      else hi = mid;
    }
    const L = at((lo + hi) / 2);
    if (cache.size > CACHE_LIMIT) cache.clear();
    cache.set(k, L);
    return L;
  };
}
