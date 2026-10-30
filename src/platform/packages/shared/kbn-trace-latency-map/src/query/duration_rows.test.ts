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
  durationToRow,
  parseDurationStats,
  rowToDuration,
} from './duration_rows';
import type { DurationStats } from '../types';

const stats: DurationStats = {
  min: 100_000,
  p90: 5_000_000,
  p95: 8_000_000,
  p99: 10_000_000,
  max: 2_000_000_000,
  spans: 10,
};

describe('latency map rows', () => {
  it('spans the fastest span to the p99 on a log scale, then the p99 to the max', () => {
    expect(rowToDuration(0, stats)).toBeCloseTo(100_000);
    expect(rowToDuration(LATENCY_MAP_INNER_ROWS, stats)).toBeCloseTo(10_000_000);
    expect(rowToDuration(LATENCY_MAP_INNER_ROWS + 1, stats)).toBeGreaterThan(2_000_000_000);
  });

  it.each([100_000, 450_000, 9_999_000, 10_000_000, 500_000_000])('round-trips %s ns', (duration) => {
    expect(rowToDuration(durationToRow(duration, stats), stats)).toBeCloseTo(duration, 1);
  });

  it('keeps a map whose max equals its p99 from collapsing the top row', () => {
    const flat = { ...stats, min: 500_000, p99: 500_000, max: 500_000 };
    expect(rowToDuration(LATENCY_MAP_INNER_ROWS + 1, flat)).toBeGreaterThan(500_000);
  });

  it('reads the statistics table', () => {
    expect(
      parseDurationStats({
        columns: ['min', 'p90', 'p95', 'p99', 'max', 'spans'].map((name) => ({ name, type: 'long' })),
        values: [[1, 2, 3, 4, 5, 6]],
      })
    ).toEqual({ min: 1, p90: 2, p95: 3, p99: 4, max: 5, spans: 6 });
  });

  describe('a range under a microsecond', () => {
    // OTel spans of 100 to 900 ns: the rows must follow them, not stop at 1µs.
    const sub: DurationStats = { min: 100, p90: 700, p95: 800, p99: 900, max: 1200, spans: 100 };

    it('starts at the fastest span and ends at the p99', () => {
      expect(rowToDuration(0, sub)).toBeCloseTo(100);
      expect(rowToDuration(LATENCY_MAP_INNER_ROWS, sub)).toBeCloseTo(900);
    });

    it('keeps the bounds of the first row under the p99, where its spans are', () => {
      expect(rowToDuration(1, sub)).toBeGreaterThan(100);
      expect(rowToDuration(1, sub)).toBeLessThan(900);
    });

    it.each([100, 250, 600, 890])('round-trips %s ns', (duration) => {
      expect(rowToDuration(durationToRow(duration, sub), sub)).toBeCloseTo(duration, 3);
    });

    it('gives the top row a height, up to the slowest span', () => {
      expect(rowToDuration(LATENCY_MAP_INNER_ROWS + 1, sub)).toBeGreaterThan(sub.max);
    });
  });
});
