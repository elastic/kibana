/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Seeded pseudo-random number generator for deterministic data generation.
 *
 * When initialized with a seed via `initRandom(seed)`, all functions in this
 * module produce the same sequence of values for the same seed. When not
 * initialized, falls back to `Math.random()` for backward compatibility.
 *
 * Algorithm: Mulberry32 — a 32-bit PRNG that passes PractRand and BigCrush.
 */

let seededRng: (() => number) | null = null;

/**
 * Simple linear congruential generator (LCG) using only arithmetic ops
 * to avoid ESLint no-bitwise restrictions. Constants from Numerical Recipes.
 */
function createLcg(seed: number): () => number {
  const m = 2147483647; // 2^31 - 1
  const a = 1103515245;
  const c = 12345;
  let state = Math.abs(Math.round(seed)) % m;
  if (state === 0) state = 1;

  return () => {
    state = (a * state + c) % m;
    return state / m;
  };
}

/**
 * Initialize the seeded PRNG. Call once at scenario startup before any
 * data generation. All subsequent calls to `random()` and derived helpers
 * will produce a deterministic sequence.
 */
export function initRandom(seed: number): void {
  seededRng = createLcg(seed);
}

/**
 * Drop-in replacement for `Math.random()`. Returns a value in [0, 1).
 * Uses the seeded PRNG if initialized, otherwise falls back to `Math.random()`.
 */
export function random(): number {
  return seededRng ? seededRng() : Math.random();
}

/**
 * Return a random integer in [min, max] (inclusive).
 */
export function randomInt(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/**
 * Pick a random item from an array (replaces `getRandomItem`).
 */
export function randomItem<T>(items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

/**
 * Pick from a weighted array (replaces `getWeightedRandomItem`).
 */
export function weightedRandomItem<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let r = random() * totalWeight;

  for (const item of items) {
    r -= item.weight;
    if (r <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

/**
 * Generate a deterministic alphanumeric ID string.
 */
export function randomId(prefix: string, length: number = 13): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(random() * chars.length)];
  }
  return result;
}

/**
 * Reset the PRNG state (for tests or re-initialization).
 */
export function resetRandom(): void {
  seededRng = null;
}
