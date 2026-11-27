/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apcaLc, oklchToHex } from './color';
import { DEFAULT_PARAMS } from './defaults';
import type { Hex } from './types';

const L_MIN = 0.03;
const L_MAX = 0.985;
// `reach` widens the range, so a color can sit on a background past the limits, like white.
export const clampL = (L: number, reach = L_MIN) =>
  Math.min(Math.max(L_MAX, reach), Math.max(Math.min(L_MIN, reach), L));

const ITERATIONS = 30;
const CACHE_LIMIT = 20000;

// APCA reads 0 below Lc 7.3, so lower targets step off the background in lightness instead, capped so dark and light
// match. Above PERCEPTUAL_BELOW the step blends into the real Lc 7.3 lightness, so there's no jump.
const APCA_FLOOR = 7.3;
const PERCEPTUAL_BELOW = DEFAULT_PARAMS.lc.faint;

const grayFloorStep = () => {
  let lo = 0;
  let hi = 0.5;
  for (let i = 0; i < ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    if (Math.abs(apcaLc(oklchToHex(1 - mid, 0, 0), '#FFFFFF')) < APCA_FLOOR) lo = mid;
    else hi = mid;
  }
  return hi;
};
const SUB_FLOOR_STEP = grayFloorStep();

// Lightness for a target below the floor, given where the floor is reached.
const belowFloor = (target: number, from: number, floor: number) => {
  const toFloor = floor - from;
  const step = Math.sign(toFloor) * Math.min(Math.abs(toFloor), SUB_FLOOR_STEP);
  const t = Math.max(0, target);
  if (t <= PERCEPTUAL_BELOW) return from + (step * t) / APCA_FLOOR;
  const knee = from + (step * PERCEPTUAL_BELOW) / APCA_FLOOR;
  return knee + ((floor - knee) * (t - PERCEPTUAL_BELOW)) / (APCA_FLOOR - PERCEPTUAL_BELOW);
};

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
      return belowFloor(target, from, floor);
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
