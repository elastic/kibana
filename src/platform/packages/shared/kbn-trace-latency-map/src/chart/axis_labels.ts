/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LATENCY_MAP_INNER_ROWS, LATENCY_MAP_ROWS } from '../query/duration_rows';
import type { TimeGrid } from '../query/time_grid';
import type { DurationStats } from '../types';
import { formatDurationUs, getDurationTicks, getTimeTicks } from '../geometry/ticks';

/**
 * Labels for the duration rows. The chart labels rows, not values, so a row gets the round
 * duration (1, 2, 5 times a power of ten) that falls inside it, and the rest stay blank; rows
 * closer than `minRowGap` to the label below are left blank too. The top row reads from the p99.
 */
export function getYAxisLabels(stats: DurationStats, minRowGap: number): Map<number, string> {
  const labels = new Map<number, string>();
  let lastRow = -Infinity;
  for (const tick of getDurationTicks(stats, 0)) {
    const row = Math.min(LATENCY_MAP_INNER_ROWS - 1, Math.floor(tick.row));
    if (labels.has(row) || row - lastRow < minRowGap) continue;
    labels.set(row, tick.label);
    lastRow = row;
  }
  const topRow = LATENCY_MAP_ROWS - 1;
  labels.forEach((_, row) => {
    if (topRow - row < minRowGap) labels.delete(row);
  });
  labels.set(topRow, `≥${formatDurationUs(stats.p99)}`);
  return labels;
}

/** Labels for the time columns: round times of `timeZone`, on the column each falls in. */
export function getXAxisLabels(
  timeGrid: TimeGrid,
  labelCount: number,
  timeZone?: string
): Map<number, string> {
  const { fromMs, binMs, bins } = timeGrid;
  const labels = new Map<number, string>();
  for (const tick of getTimeTicks(fromMs, fromMs + bins * binMs, labelCount, timeZone)) {
    const column = Math.round((tick.timestampMs - fromMs) / binMs);
    if (column >= 0 && column < bins) labels.set(column, tick.label);
  }
  return labels;
}
