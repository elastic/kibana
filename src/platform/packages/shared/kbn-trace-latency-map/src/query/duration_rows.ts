/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { DurationStats } from '../types';

/** Log-scale rows from the fastest span to the p99. */
export const LATENCY_MAP_INNER_ROWS = 23;
/** Plus one reserved row for p99 to max, so slow outliers stay visible without squashing the rest. */
export const LATENCY_MAP_ROWS = LATENCY_MAP_INNER_ROWS + 1;

/** ES|QL returns at most this many rows, and drops the rest without an error. */
export const ESQL_MAX_ROWS = 10_000;
/** Time columns the grid query can return in full: one row per cell. */
export const MAX_TIME_BINS = Math.floor(ESQL_MAX_ROWS / LATENCY_MAP_ROWS);

/** The shortest duration the rows tell apart, in nanoseconds: one, the unit of OTel durations. */
const MIN_DURATION = 1;

/** Log10 bounds of the inner rows: the fastest span to the p99. */
export function getLogDurationBounds(stats: DurationStats) {
  const floor = Math.max(stats.min, MIN_DURATION);
  return {
    logMin: Math.log10(floor),
    logMax: Math.log10(Math.max(stats.p99, floor * 1.01)),
  };
}

/**
 * Height of the reserved top row in ns, from the p99 to just above the max. Never zero:
 * when the max equals the p99, the row still covers the spans at that duration.
 */
const getTopRowSpan = (stats: DurationStats) =>
  Math.max(stats.max - stats.p99, stats.p99 * 0.001, MIN_DURATION) * 1.001;

/** Duration (ns) at a fractional row position: log scale below the p99, linear above it. */
export function rowToDuration(row: number, stats: DurationStats): number {
  if (row >= LATENCY_MAP_INNER_ROWS) {
    return stats.p99 + (row - LATENCY_MAP_INNER_ROWS) * getTopRowSpan(stats);
  }
  const { logMin, logMax } = getLogDurationBounds(stats);
  return Math.pow(10, logMin + (row / LATENCY_MAP_INNER_ROWS) * (logMax - logMin));
}

/** Fractional row position of a duration (ns), the inverse of {@link rowToDuration}. */
export function durationToRow(duration: number, stats: DurationStats): number {
  if (duration >= stats.p99) {
    const fraction = (duration - stats.p99) / getTopRowSpan(stats);
    return LATENCY_MAP_INNER_ROWS + Math.min(1, Math.max(0, fraction));
  }
  const { logMin, logMax } = getLogDurationBounds(stats);
  return (
    ((Math.log10(Math.max(duration, MIN_DURATION)) - logMin) / (logMax - logMin)) *
    LATENCY_MAP_INNER_ROWS
  );
}

/** The duration statistics of a range, from the table of `buildDurationStatsQuery`. */
export function parseDurationStats(table: ESQLSearchResponse): DurationStats {
  const row = table.values[0] ?? [];
  const read = (name: string) =>
    Number(row[table.columns.findIndex((column) => column.name === name)] ?? 0);
  return {
    min: read('min'),
    p90: read('p90'),
    p95: read('p95'),
    p99: read('p99'),
    max: read('max'),
    spans: read('spans'),
  };
}
