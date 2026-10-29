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

  describe('a range under a microsecond', () => {
    // OTel spans of 100 to 900 ns: the rows must follow them, not stop at 1µs.
    const sub: DurationStats = { min: 0.1, p90: 0.7, p95: 0.8, p99: 0.9, max: 1.2, spans: 100 };

    it('starts at the fastest span and ends at the p99', () => {
      expect(rowToDurationUs(0, sub)).toBeCloseTo(0.1);
      expect(rowToDurationUs(LATENCY_MAP_INNER_ROWS, sub)).toBeCloseTo(0.9);
    });

    it('keeps the bounds of the first row under the p99, where its spans are', () => {
      expect(rowToDurationUs(1, sub)).toBeGreaterThan(0.1);
      expect(rowToDurationUs(1, sub)).toBeLessThan(0.9);
    });

    it.each([0.1, 0.25, 0.6, 0.89])('round-trips %s µs', (durationUs) => {
      expect(rowToDurationUs(durationUsToRow(durationUs, sub), sub)).toBeCloseTo(durationUs, 6);
    });

    it('gives the top row a height, up to the slowest span', () => {
      expect(rowToDurationUs(LATENCY_MAP_INNER_ROWS + 1, sub)).toBeGreaterThan(sub.max);
    });
  });
});
