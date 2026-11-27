/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSameRange } from '../geometry/cell_range';
import type { CellRange } from '../geometry/cell_range';
import { durationToRow } from '../query/duration_rows';
import type { DurationStats } from '../types';

/** The percentiles the "Select slowest" shortcuts start from. */
export type SlowestPercentile = 90 | 95 | 99;
export const SLOWEST_PERCENTILES: SlowestPercentile[] = [90, 95, 99];

export const percentileDuration = (stats: DurationStats, percentile: SlowestPercentile): number =>
  percentile === 99 ? stats.p99 : percentile === 95 ? stats.p95 : stats.p90;

/** The size of the map, in cells. */
interface MapSize {
  bins: number;
  rows: number;
}

/** The cells a slowest shortcut selects: every column, from the percentile's row up. */
export const getSlowestRange = (
  stats: DurationStats,
  percentile: SlowestPercentile,
  { bins, rows }: MapSize
): CellRange => {
  const row = Math.floor(durationToRow(percentileDuration(stats, percentile), stats));
  return { x0: 0, x1: bins, y0: Math.min(rows - 1, Math.max(0, row)), y1: rows };
};

/**
 * The slowest shortcut a range is, if it is one. Percentiles that coincide on the same rows
 * (a spike holding most spans) all match: the one the user picked wins, so the menu answers
 * the click even when the range it commits is unchanged; without a pick (a restored URL),
 * the highest percentile is named.
 */
export const findSlowestPercentile = (
  range: CellRange,
  stats: DurationStats,
  size: MapSize,
  chosen?: SlowestPercentile
): SlowestPercentile | undefined => {
  const matches = [...SLOWEST_PERCENTILES]
    .reverse()
    .filter((percentile) => isSameRange(range, getSlowestRange(stats, percentile, size)));
  return chosen && matches.includes(chosen) ? chosen : matches[0];
};
