/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  LATENCY_MAP_INNER_ROWS,
  durationUsToRow,
  parseDurationStats,
  rowToDurationUs,
} from './duration_rows';
import type { DurationStats } from '../types';

const stats: DurationStats = {
  min: 100,
  p90: 5000,
  p95: 8000,
  p99: 10_000,
  max: 2_000_000,
  spans: 10,
};

describe('latency map rows', () => {
  it('spans the fastest span to the p99 on a log scale, then the p99 to the max', () => {
    expect(rowToDurationUs(0, stats)).toBeCloseTo(100);
    expect(rowToDurationUs(LATENCY_MAP_INNER_ROWS, stats)).toBeCloseTo(10_000);
    expect(rowToDurationUs(LATENCY_MAP_INNER_ROWS + 1, stats)).toBeGreaterThan(2_000_000);
  });

  it.each([100, 450, 9_999, 10_000, 500_000])('round-trips %s µs', (durationUs) => {
    expect(rowToDurationUs(durationUsToRow(durationUs, stats), stats)).toBeCloseTo(durationUs, 4);
  });

  it('keeps a map whose max equals its p99 from collapsing the top row', () => {
    const flat = { ...stats, min: 500, p99: 500, max: 500 };
    expect(rowToDurationUs(LATENCY_MAP_INNER_ROWS + 1, flat)).toBeGreaterThan(500);
  });

  it('reads the statistics table', () => {
    expect(
      parseDurationStats({
        columns: ['min', 'p90', 'p95', 'p99', 'max', 'spans'].map((name) => ({ name })),
        values: [[1, 2, 3, 4, 5, 6]],
      })
    ).toEqual({ min: 1, p90: 2, p95: 3, p99: 4, max: 5, spans: 6 });
  });
});
