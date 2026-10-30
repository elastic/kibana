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
import { durationUsToRow, getLogDurationBounds } from '../query/duration_rows';

/** Each unit, and how many of it make the next one up. */
const DURATION_UNITS = [
  { unit: 'µs', perNext: 1000 },
  { unit: 'ms', perNext: 1000 },
  { unit: 's', perNext: 60 },
  { unit: 'min', perNext: Infinity },
];

/**
 * A duration in µs as `850µs`, `4.2ms`, `1.5s` or `2.3min`. Rounded before the unit is picked, so
 * 999.6µs reads `1ms` and not `1000µs`.
 */
export function formatDurationUs(us: number): string {
  let value = us;
  for (const { unit, perNext } of DURATION_UNITS) {
    const rounded = Number(value.toPrecision(3));
    if (rounded < perNext) return `${rounded}${unit}`;
    value /= perNext;
  }
  return `${Number(value.toPrecision(3))}min`;
}

export interface DurationTick {
  durationUs: number;
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
      const durationUs = mantissa * Math.pow(10, exponent);
      if (durationUs < Math.pow(10, logMin) || durationUs > Math.pow(10, logMax)) continue;
      const row = durationUsToRow(durationUs, stats);
      if (row - lastRow < minRowGap) continue;
      ticks.push({ durationUs, row, label: formatDurationUs(durationUs) });
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

export interface TimeTick {
  timestampMs: number;
  label: string;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const TICK_STEPS = [
  SECOND,
  5 * SECOND,
  10 * SECOND,
  15 * SECOND,
  30 * SECOND,
  MINUTE,
  5 * MINUTE,
  10 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  DAY,
  WEEK,
];

/**
 * The step of the ticks: the smallest of the usual ones that gives no more than `count` ticks, or
 * whole weeks for a range longer than those reach.
 */
function getTickStep(rangeMs: number, count: number) {
  const wanted = rangeMs / Math.max(1, count);
  return TICK_STEPS.find((candidate) => candidate >= wanted) ?? Math.ceil(wanted / WEEK) * WEEK;
}

/** Ticks at round local times of `timeZone` (the browser's when absent), about `count` of them. */
export function getTimeTicks(
  fromMs: number,
  toMs: number,
  count: number,
  timeZone?: string
): TimeTick[] {
  const zone = resolveTimeZone(timeZone);
  const rangeMs = toMs - fromMs;
  const step = getTickStep(rangeMs, count);
  const format =
    step < MINUTE ? 'HH:mm:ss' : step < DAY ? (rangeMs > DAY ? 'MMM D HH:mm' : 'HH:mm') : 'MMM D';

  const offsetAt = (timestampMs: number) => moment.tz(timestampMs, zone).utcOffset() * MINUTE;
  /** The first round local time after `timestampMs`, with the offset in force at that time. */
  const alignAfter = (timestampMs: number) => {
    const guess = Math.ceil((timestampMs + 1 + offsetAt(timestampMs)) / step) * step;
    const aligned = guess - offsetAt(guess - offsetAt(timestampMs));
    // The offset can change between the two: align once more with the one in force there.
    const settled = guess - offsetAt(aligned);
    return settled > timestampMs ? settled : aligned;
  };

  const ticks: TimeTick[] = [];
  for (
    let timestampMs = alignAfter(fromMs - 1);
    timestampMs <= toMs;
    timestampMs = alignAfter(timestampMs)
  ) {
    ticks.push({ timestampMs, label: moment.tz(timestampMs, zone).format(format) });
  }
  return ticks;
}
