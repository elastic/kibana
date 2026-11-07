/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computeTicks } from './timeline_ticks';

describe('computeTicks', () => {
  it('uses round steps that start at zero', () => {
    expect(computeTicks(1_000)).toEqual([0, 200, 400, 600, 800, 1_000]);
    expect(computeTicks(700)).toEqual([0, 200, 400, 600]);
  });

  it('handles sub-millisecond domains without float noise', () => {
    expect(computeTicks(0.5)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5]);
  });

  it('returns nothing for an empty or invalid domain', () => {
    expect(computeTicks(0)).toEqual([]);
    expect(computeTicks(-5)).toEqual([]);
    expect(computeTicks(Number.NaN)).toEqual([]);
    expect(computeTicks(100, 0)).toEqual([]);
  });
});
