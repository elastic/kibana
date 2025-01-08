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
  it('should return the added and removed parts between 2 objects', () => {
    const { added, removed } = calculateObjectDiff({ alpha: 1, beta: 2 }, { alpha: 1, gamma: 3 });
    expect(added).toEqual({ gamma: 3 });
    expect(removed).toEqual({ beta: 2 });
  });

  it('should work on nested objects', () => {
    const { added, removed } = calculateObjectDiff(
      { alpha: 1, beta: { gamma: 2, delta: { sigma: 7 } } },
      { alpha: 1, beta: { gamma: 2, eta: 4 } }
    );

    expect(added).toEqual({ beta: { eta: 4 } });
    expect(removed).toEqual({ beta: { delta: { sigma: 7 } } });
  });

  it('should return empty added/removed when the objects are the same', () => {
    const { added, removed } = calculateObjectDiff({ alpha: 1, beta: 2 }, { alpha: 1, beta: 2 });
    expect(added).toEqual({});
    expect(removed).toEqual({});
  });
});
