/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSeededRandom } from './seeded_random';

const draw = (seed: string, count: number) => {
  const random = createSeededRandom(seed);
  return Array.from({ length: count }, () => random());
};

describe('createSeededRandom', () => {
  it('returns the same sequence for the same seed', () => {
    expect(draw('a', 50)).toEqual(draw('a', 50));
  });

  it('returns different sequences for different seeds', () => {
    expect(draw('a', 5)).not.toEqual(draw('b', 5));
    expect(draw('app:1', 5)).not.toEqual(draw('app:2', 5));
  });

  it('returns numbers in [0, 1), evenly spread', () => {
    const values = draw('spread', 10_000);
    const mean = values.reduce((total, value) => total + value, 0) / values.length;

    values.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });

  it('does not repeat itself across blocks', () => {
    const values = draw('blocks', 1_000);

    expect(new Set(values).size).toBe(values.length);
  });
});
