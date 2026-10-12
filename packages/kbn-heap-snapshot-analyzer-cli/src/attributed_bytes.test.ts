/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateAttributedBytes } from './attributed_bytes';

describe('aggregateAttributedBytes', () => {
  it('partitions nested owners and an unattributed root without counting descendants twice', () => {
    // Dominator tree: root (10) -> package A (20) -> package B (30),
    // with an additional unowned child (40) below package A.
    const result = aggregateAttributedBytes(
      Float64Array.from([10, 20, 30, 40]),
      Int32Array.from([-1, 0, 1, -1]),
      2
    );

    expect([...result.packages]).toEqual([20, 30]);
    expect(result.unattributed).toBe(50);
    expect([...result.packages].reduce((sum, bytes) => sum + bytes, result.unattributed)).toBe(100);
  });

  it('rejects malformed attribution rather than silently losing bytes', () => {
    expect(() => aggregateAttributedBytes(Float64Array.from([1]), Int32Array.from([2]), 2)).toThrow(
      'Invalid package attribution'
    );
  });
});
