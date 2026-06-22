/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { laneDepth } from './workflow_graph_edge';

describe('laneDepth', () => {
  // Helper: collect depths for all slots in a count.
  const allDepths = (count: number) => Array.from({ length: count }, (_, i) => laneDepth(i, count));

  it('is mirror-symmetric: laneDepth(slot, count) === laneDepth(count-1-slot, count)', () => {
    for (const count of [1, 2, 3, 4, 5, 6, 7]) {
      for (let slot = 0; slot < count; slot++) {
        expect(laneDepth(slot, count)).toBe(laneDepth(count - 1 - slot, count));
      }
    }
  });

  it('outermost slots (index 0 and count-1) always have depth 0', () => {
    for (const count of [1, 2, 3, 4, 5, 6, 7]) {
      expect(laneDepth(0, count)).toBe(0);
      expect(laneDepth(count - 1, count)).toBe(0);
    }
  });

  it('center slot has the maximum depth for odd counts', () => {
    for (const count of [1, 3, 5, 7]) {
      const centerIdx = (count - 1) / 2;
      const expectedMax = (count - 1) / 2;
      expect(laneDepth(centerIdx, count)).toBe(expectedMax);
    }
  });

  it('the two center slots share the maximum depth for even counts', () => {
    for (const count of [2, 4, 6]) {
      const c1 = count / 2 - 1;
      const c2 = count / 2;
      const expectedMax = (count - 2) / 2; // = count/2 - 1
      expect(laneDepth(c1, count)).toBe(expectedMax);
      expect(laneDepth(c2, count)).toBe(expectedMax);
    }
  });

  it('always returns integers', () => {
    for (const count of [1, 2, 3, 4, 5, 6, 7]) {
      for (let slot = 0; slot < count; slot++) {
        expect(Number.isInteger(laneDepth(slot, count))).toBe(true);
      }
    }
  });

  it('is non-decreasing from each outer slot toward the center (monotonic inward)', () => {
    for (const count of [3, 4, 5, 6, 7]) {
      const depths = allDepths(count);
      const half = Math.floor(count / 2);
      // Left half: depths should be non-decreasing
      for (let i = 0; i < half - 1; i++) {
        expect(depths[i + 1]).toBeGreaterThanOrEqual(depths[i]);
      }
      // Right half: depths should be non-increasing (mirror of left)
      for (let i = half; i < count - 1; i++) {
        expect(depths[i + 1]).toBeLessThanOrEqual(depths[i]);
      }
    }
  });

  it('produces [0] for count=1', () => {
    expect(allDepths(1)).toEqual([0]);
  });

  it('produces [0, 0] for count=2 (both outer)', () => {
    expect(allDepths(2)).toEqual([0, 0]);
  });

  it('produces [0, 1, 0] for count=3', () => {
    expect(allDepths(3)).toEqual([0, 1, 0]);
  });

  it('produces [0, 1, 1, 0] for count=4', () => {
    expect(allDepths(4)).toEqual([0, 1, 1, 0]);
  });

  it('produces [0, 1, 2, 1, 0] for count=5', () => {
    expect(allDepths(5)).toEqual([0, 1, 2, 1, 0]);
  });
});
