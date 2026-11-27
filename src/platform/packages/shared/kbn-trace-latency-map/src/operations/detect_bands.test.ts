/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LATENCY_MAP_ROWS, rowToDuration } from '../query/duration_rows';
import { MAX_BANDS, detectDurationBands } from './detect_bands';

const stats = {
  min: 100,
  p90: 5_000,
  p95: 8_000,
  p99: 10_000,
  max: 2_000_000,
  spans: 1000,
};

/** A histogram with the given spans at each mode, a little spread around it. */
const histogram = (modes: Array<{ row: number; spans: number }>) => {
  const counts = new Array<number>(LATENCY_MAP_ROWS).fill(0);
  for (const { row, spans } of modes) {
    counts[row] += spans;
    counts[row - 1] += spans / 4;
    counts[row + 1] += spans / 4;
  }
  return counts;
};

const noErrors = new Array<number>(LATENCY_MAP_ROWS).fill(0);

describe('detectDurationBands', () => {
  it('returns nothing for an empty histogram or a single mode, which says nothing', () => {
    expect(detectDurationBands(noErrors, stats, noErrors)).toEqual([]);
    expect(detectDurationBands(histogram([{ row: 6, spans: 400 }]), stats, noErrors)).toEqual([]);
  });

  it('finds the modes as bands, in duration order, with their rows and bounds', () => {
    const counts = histogram([
      { row: 5, spans: 400 },
      { row: 15, spans: 200 },
    ]);
    const errors = noErrors.map((_, row) => (row === 15 ? 50 : 0));
    const bands = detectDurationBands(counts, stats, errors);
    expect(bands).toHaveLength(2);
    const [fast, slow] = bands;
    expect(fast.lowRow).toBeLessThanOrEqual(5);
    expect(fast.highRow).toBeGreaterThanOrEqual(5);
    expect(slow.lowRow).toBeLessThanOrEqual(15);
    expect(slow.highRow).toBeGreaterThanOrEqual(15);
    expect(fast.count).toBeGreaterThan(slow.count);
    expect(slow.errors).toBe(50);
    expect(fast.share + slow.share).toBeLessThanOrEqual(1);
    // The bounds are the rows' duration edges, in nanoseconds.
    expect(fast.minDuration).toBe(rowToDuration(fast.lowRow, stats));
    expect(fast.maxDuration).toBe(rowToDuration(fast.highRow + 1, stats));
  });

  it('keeps the most populous modes when there are too many, still in duration order', () => {
    const counts = histogram([
      { row: 2, spans: 500 },
      { row: 6, spans: 400 },
      { row: 10, spans: 450 },
      { row: 14, spans: 300 },
      { row: 18, spans: 100 },
    ]);
    const bands = detectDurationBands(counts, stats, noErrors);
    expect(bands).toHaveLength(MAX_BANDS);
    expect(bands.map((band) => band.lowRow)).toEqual(
      [...bands.map((band) => band.lowRow)].sort((a, b) => a - b)
    );
    // The thin mode at row 18 is the one dropped.
    expect(bands.some((band) => band.lowRow <= 18 && band.highRow >= 18)).toBe(false);
  });
});
