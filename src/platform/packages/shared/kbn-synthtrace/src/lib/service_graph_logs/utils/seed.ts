/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hashStr } from '../placeholders';

export function resolveEffectiveSeed(
  seed: number | undefined,
  index: number,
  timestamp?: number
): number {
  if (seed != null) {
    return seed + index;
  }
  return (timestamp ?? Date.now()) + index;
}

/**
 * Derives a deterministic sub-stream seed from a base seed and an arbitrary name.
 */
export function deriveSeed(baseSeed: number, name: string): number {
  // eslint-disable-next-line no-bitwise
  return (baseSeed ^ hashStr(name)) >>> 0;
}

/**
 * Converts a fractional weight into a whole-number doc count deterministically.
 * The integer part is always emitted; the fractional remainder is resolved to a
 * probabilistic +1 using one draw from the provided RNG.
 *
 * e.g. weight=2.3 → always 2, +1 with 30% probability per tick.
 */
export const probabilisticCount = (weight: number, rng: () => number): number => {
  if (!Number.isFinite(weight) || weight <= 0) {
    return 0;
  }
  const intPart = Math.floor(weight);
  return intPart + (rng() < weight - intPart ? 1 : 0);
};
