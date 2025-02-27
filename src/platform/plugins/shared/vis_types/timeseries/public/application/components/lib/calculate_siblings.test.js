/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { calculateSiblings } from './calculate_siblings';

describe('calculateSiblings(metrics, metric)', () => {
  test('should return all siblings', () => {
    const metrics = [
      { id: 1, type: 'max', field: 'network.bytes' },
      { id: 2, type: 'derivative', field: 1 },
      { id: 3, type: 'derivative', field: 2 },
      { id: 4, type: 'moving_average', field: 2 },
      { id: 5, type: 'count' },
    ];
    const siblings = calculateSiblings(metrics, { id: 2 });
    expect(siblings).toEqual([
      { id: 1, type: 'max', field: 'network.bytes' },
      { id: 5, type: 'count' },
    ]);
  });
});
