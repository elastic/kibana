/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { calculateObjectDiff } from './calculate_object_diff';

describe('calculateObjectDiff', () => {
  it('should return the added, removed and updated parts between 2 objects', () => {
    const { added, removed, updated } = calculateObjectDiff(
      { alpha: 1, beta: 2, sigma: 4 },
      { alpha: 1, gamma: 3, sigma: 5 }
    );
    expect(added).toEqual({ gamma: 3 });
    expect(removed).toEqual({ beta: 2 });
    expect(updated).toEqual({ sigma: 5 });
  });

  it('should work on nested objects', () => {
    const { added, removed, updated } = calculateObjectDiff(
      { alpha: 1, beta: { gamma: 2, delta: { sigma: 7, omega: 8 } } },
      { alpha: 1, beta: { gamma: 2, delta: { omega: 9 }, eta: 4 } }
    );

    expect(added).toEqual({ beta: { eta: 4 } });
    expect(removed).toEqual({ beta: { delta: { sigma: 7 } } });
    expect(updated).toEqual({ beta: { delta: { omega: 9 } } });
  });

  it('should return empty added/removed/updated when the objects are the same', () => {
    const { added, removed, updated } = calculateObjectDiff(
      { alpha: 1, beta: 2 },
      { alpha: 1, beta: 2 }
    );
    expect(added).toEqual({});
    expect(removed).toEqual({});
    expect(updated).toEqual({});
  });

  it('should handle array fields correctly', () => {
    const { added, removed, updated } = calculateObjectDiff(
      { alpha: [1, 2, 3], beta: [4, 5, 6] },
      { alpha: [1, 2, 3], beta: [4, 5, 7] }
    );
    expect(added).toEqual({});
    expect(removed).toEqual({});
    expect(updated).toEqual({ beta: [undefined, undefined, 7] });
  });

  it('should detect added and removed array fields', () => {
    const { added, removed, updated } = calculateObjectDiff(
      { alpha: [1, 2, 3] },
      { beta: [4, 5, 6] }
    );
    expect(added).toEqual({ beta: [4, 5, 6] });
    expect(removed).toEqual({ alpha: [1, 2, 3] });
    expect(updated).toEqual({});
  });

  it('should handle arrays containing objects correctly', () => {
    const { added, removed, updated } = calculateObjectDiff(
      { alpha: [{ beta: 1 }, { gamma: 2 }] },
      { alpha: [{ beta: 1 }, { gamma: 3 }] }
    );
    expect(added).toEqual({});
    expect(removed).toEqual({});
    expect(updated).toEqual({ alpha: [{}, { gamma: 3 }] });
  });
});
