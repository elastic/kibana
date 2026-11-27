/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rowToDuration } from '../query/duration_rows';
import type { DurationStats } from '../types';

/** One duration group of an operation: a mode of its histogram, as whole rows. */
export interface DurationBand {
  /** Spans in the band. */
  count: number;
  /** Share of the histogram's spans in the band. */
  share: number;
  /** Failed spans in the band. */
  errors: number;
  lowRow: number;
  highRow: number;
  /** Nanoseconds. */
  minDuration: number;
  maxDuration: number;
}

/** A band must hold at least this share of all spans. */
const MIN_BAND_SHARE = 0.08;
/** More bands than this crowd the labels next to the map. */
export const MAX_BANDS = 4;

const sumRows = (values: number[], lowRow: number, highRow: number) =>
  values.slice(lowRow, highRow + 1).reduce((a, b) => a + b, 0);

/**
 * Modes of one operation's duration histogram (span count per row): local peaks separated
 * by valleys, as in the prototype. A single mode says nothing, so it returns no bands.
 * With more than {@link MAX_BANDS} modes it keeps the most populous ones, in duration
 * order. Across operations, modes mostly separate the operations from each other, so
 * callers pass one operation's histogram.
 */
export function detectDurationBands(
  rowCounts: number[],
  stats: DurationStats,
  rowErrors: number[]
): DurationBand[] {
  const rows = rowCounts.length;
  const total = rowCounts.reduce((a, b) => a + b, 0);
  if (!total) return [];
  const smoothed = rowCounts.map(
    (v, i) => ((rowCounts[i - 1] ?? v) + 2 * v + (rowCounts[i + 1] ?? v)) / 4
  );
  const peakFloor = (total / rows) * 0.9;
  const bands: DurationBand[] = [];
  let i = 0;
  while (i < rows) {
    if (smoothed[i] <= peakFloor) {
      i++;
      continue;
    }
    let j = i;
    let peak = smoothed[i];
    while (j + 1 < rows && smoothed[j + 1] > Math.max(peakFloor * 0.75, peak * 0.5)) {
      j++;
      peak = Math.max(peak, smoothed[j]);
    }
    const count = sumRows(rowCounts, i, j);
    if (count > total * MIN_BAND_SHARE) {
      bands.push({
        count,
        share: count / total,
        errors: sumRows(rowErrors, i, j),
        lowRow: i,
        highRow: j,
        minDuration: rowToDuration(i, stats),
        maxDuration: rowToDuration(j + 1, stats),
      });
    }
    i = j + 1;
  }
  if (bands.length < 2) return [];
  return bands
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_BANDS)
    .sort((a, b) => a.lowRow - b.lowRow);
}
