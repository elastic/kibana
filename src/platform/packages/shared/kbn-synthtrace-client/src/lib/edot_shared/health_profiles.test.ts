/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSeededRandom } from '../utils/seeded_random';
import { sample } from './health_profiles';

describe('sample', () => {
  const samples = (max?: number) => {
    const random = createSeededRandom('health-profiles-test');
    return Array.from({ length: 1_000 }, () => sample({ median: 100, sigma: 2, max }, random));
  };

  it('caps the samples at max, without changing the others', () => {
    const uncapped = samples();
    const capped = samples(500);

    expect(Math.max(...uncapped)).toBeGreaterThan(500);
    expect(Math.max(...capped)).toBe(500);
    expect(capped).toEqual(uncapped.map((value) => Math.min(value, 500)));
  });
});
