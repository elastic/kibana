/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import type { DurationStats } from '../types';
import { durationToRow, getLogDurationBounds } from '../query/duration_rows';

/** Each unit, and how many of it make the next one up. */
const DURATION_UNITS = [
  { unit: 'ns', perNext: 1000 },
  { unit: 'µs', perNext: 1000 },
  { unit: 'ms', perNext: 1000 },
  { unit: 's', perNext: 60 },
  { unit: 'min', perNext: Infinity },
];

/**
 * A duration in nanoseconds as `850ns`, `4.2ms`, `1.5s` or `2.3min`. Rounded before the unit is
 * picked, so 999,600ns reads `1ms` and not `1000µs`.
 */
export function formatDuration(duration: number): string {
  let value = duration;
  for (const { unit, perNext } of DURATION_UNITS) {
    const rounded = Number(value.toPrecision(3));
    if (rounded < perNext) return `${rounded}${unit}`;
    value /= perNext;
  }
  return `${Number(value.toPrecision(3))}min`;
}

export interface DurationTick {
  duration: number;
  /** Fractional row of the tick, for placing it. */
  row: number;
  label: string;
}

/**
 * Ticks at 1, 2 and 5 times a power of ten, between the fastest span and the p99, dropping
 * any that would sit closer than `minRowGap` rows to the one below.
 */
export function getDurationTicks(stats: DurationStats, minRowGap: number): DurationTick[] {
  const { logMin, logMax } = getLogDurationBounds(stats);
  const ticks: DurationTick[] = [];
  let lastRow = -Infinity;
  for (let exponent = Math.floor(logMin); exponent <= Math.ceil(logMax); exponent++) {
    for (const mantissa of [1, 2, 5]) {
      const duration = mantissa * Math.pow(10, exponent);
      if (duration < Math.pow(10, logMin) || duration > Math.pow(10, logMax)) continue;
      const row = durationToRow(duration, stats);
      if (row - lastRow < minRowGap) continue;
      ticks.push({ duration, row, label: formatDuration(duration) });
      lastRow = row;
    }
  }
  return ticks;
}

/** The time zone to show times in: the one given, or else the browser's. */
export const resolveTimeZone = (timeZone?: string) =>
  timeZone && timeZone !== 'Browser' ? timeZone : moment.tz.guess();

/** A timestamp as `Oct 26, 10:03:20`, in `timeZone`. */
export const formatTimestamp = (timestampMs: number, timeZone?: string) =>
  moment.tz(timestampMs, resolveTimeZone(timeZone)).format('MMM D, HH:mm:ss');

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/**
 * The time of a column for the axis, in `timeZone`: with seconds when a column is under a minute,
 * with the date when the range is longer than a day or a column is a day, else `10:05`. Every
 * column gets one and the chart thins them to the ones that fit.
 */
export function formatColumnTime(
  timestampMs: number,
  binMs: number,
  rangeMs: number,
  timeZone?: string
) {
  const format =
    binMs < MINUTE ? 'HH:mm:ss' : binMs >= DAY ? 'MMM D' : rangeMs > DAY ? 'MMM D HH:mm' : 'HH:mm';
  return moment.tz(timestampMs, resolveTimeZone(timeZone)).format(format);
}
