/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1";
 */

import { calculateAdaptiveShardCount } from './calculate_adaptive_shard_count';

describe('calculateAdaptiveShardCount', () => {
  const MAX = 32;

  it.each([
    [0, 1],
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 4],
    [7, 4],
    [8, 8],
    [15, 8],
    [16, 16],
    [31, 16],
    [32, 32],
    [100, 32], // capped
  ])('returns %i shards for %i data nodes (max 32)', (dataNodes, expected) => {
    expect(calculateAdaptiveShardCount(dataNodes, MAX)).toBe(expected);
  });

  it('never returns more shards than the cap', () => {
    expect(calculateAdaptiveShardCount(1000, 8)).toBe(8);
  });

  it('returns 1 when the cap is below 2', () => {
    expect(calculateAdaptiveShardCount(10, 1)).toBe(1);
  });

  it('returns 1 for a non-finite data node count', () => {
    expect(calculateAdaptiveShardCount(NaN, MAX)).toBe(1);
  });
});
