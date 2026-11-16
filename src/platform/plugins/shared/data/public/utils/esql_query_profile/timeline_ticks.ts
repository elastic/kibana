/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const NICE_STEPS = [1, 2, 5, 10] as const;

/** Rounds a raw step up to 1, 2 or 5 times a power of ten. */
const niceStep = (rawStep: number): number => {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const factor = NICE_STEPS.find((step) => step >= normalized) ?? 10;
  return factor * magnitude;
};

/**
 * Tick offsets in milliseconds from the start of a domain, from 0 up to the domain length.
 * Steps are 1, 2 or 5 times a power of ten, and the count stays close to `targetCount`.
 */
export function computeTicks(durationMillis: number, targetCount = 5): number[] {
  if (!(durationMillis > 0) || targetCount < 1) {
    return [];
  }

  const step = niceStep(durationMillis / targetCount);
  const ticks: number[] = [];
  for (let index = 0; index * step <= durationMillis; index++) {
    // Rounding keeps sub-millisecond steps free of floating point noise.
    ticks.push(Math.round(index * step * 1e6) / 1e6);
  }
  return ticks;
}
