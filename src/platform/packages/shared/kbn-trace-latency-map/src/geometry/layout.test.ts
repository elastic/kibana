/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_MAX_ROWS, LATENCY_MAP_ROWS } from '../query/duration_rows';
import { LAYOUT, getTimeBinsForWidth } from './layout';

describe('getTimeBinsForWidth', () => {
  it('gives more columns to a wider map, in multiples of 5', () => {
    expect(getTimeBinsForWidth(1000)).toBeGreaterThan(getTimeBinsForWidth(600));
    expect(getTimeBinsForWidth(1000) % 5).toBe(0);
  });

  it('gives a narrow map the least', () => {
    expect(getTimeBinsForWidth(0)).toBe(LAYOUT.minTimeBins);
  });

  it('never gives more columns than the grid query returns in full, however wide the map', () => {
    [4000, 10_000, 100_000].forEach((width) => {
      expect(getTimeBinsForWidth(width) * LATENCY_MAP_ROWS).toBeLessThanOrEqual(ESQL_MAX_ROWS);
    });
  });
});
