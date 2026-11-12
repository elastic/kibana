/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** A uniformly distributed number in `[min, max)`. */
export const between = (random: () => number, min: number, max: number): number =>
  min + random() * (max - min);

export const pick = <T>(random: () => number, items: readonly T[]): T =>
  items[Math.floor(random() * items.length)];

/** Picks an item with a probability proportional to its weight, drawing one random number. */
export const pickWeighted = <T>(
  random: () => number,
  items: readonly T[],
  getWeight: (item: T) => number
): T => {
  const total = items.reduce((sum, item) => sum + getWeight(item), 0);
  let threshold = random() * total;
  for (const item of items) {
    threshold -= getWeight(item);
    if (threshold < 0) {
      return item;
    }
  }
  return items[items.length - 1];
};

/** A lowercase hex string of the given length, like trace and span IDs. */
export const randomHex = (random: () => number, length: number): string =>
  Array.from({ length }, () => Math.floor(random() * 16).toString(16)).join('');
