/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  evaluatePairedMemoryRule,
  MIN_VALID_WARM_START_MEMORY_PAIRS,
  WARM_START_MEMORY_THRESHOLD_BYTES,
} from './paired_memory_rule';

describe('evaluatePairedMemoryRule', () => {
  it('is inconclusive below the minimum pair count', () => {
    const result = evaluatePairedMemoryRule({
      deltas: Array(MIN_VALID_WARM_START_MEMORY_PAIRS - 1).fill(30 * 1024 * 1024),
    });
    expect(result).toEqual({
      pairCount: MIN_VALID_WARM_START_MEMORY_PAIRS - 1,
      thresholdBytes: WARM_START_MEMORY_THRESHOLD_BYTES,
    });
  });

  it('reports the paired mean and spread at the minimum pair count', () => {
    const result = evaluatePairedMemoryRule({
      deltas: Array(MIN_VALID_WARM_START_MEMORY_PAIRS).fill(WARM_START_MEMORY_THRESHOLD_BYTES),
    });

    expect(result.meanBytes).toBe(WARM_START_MEMORY_THRESHOLD_BYTES);
    expect(result.sampleStandardDeviationBytes).toBe(0);
    expect(result.standardErrorBytes).toBe(0);
  });

  it('reports spread for a noisy sample', () => {
    const result = evaluatePairedMemoryRule({
      deltas: [70, -30, 70, -30, 70, -30].map((value) => value * 1024 * 1024),
    });
    expect(result.meanBytes).toBe(20 * 1024 * 1024);
    expect(result.sampleStandardDeviationBytes).toBeGreaterThan(0);
  });
});
