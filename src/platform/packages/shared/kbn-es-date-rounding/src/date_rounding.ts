/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import type { OffsetPeriod } from './offset_periods';
import { offsetPeriods, periodIndexAt } from './offset_periods';
import type { IanaTimeZone } from './time_zone';

const SECOND_MS = 1e3;
const MINUTE_MS = 6e4;
const HOUR_MS = 36e5;
const DAY_MS = 864e5;
const WEEK_MS = 6048e5;
// ES|QL counts month and year multiples from January of year 1, not from the Unix epoch.
const ANCHOR_YEAR = 1;

export interface FixedDateRounding {
  readonly kind: 'fixed';
  readonly widthMs: number;
}

export interface CalendarDateRounding {
  readonly kind: 'calendar';
  readonly unit: 'day' | 'isoWeek' | 'month' | 'year';
  readonly amount: number;
}

/** How Elasticsearch assigns timestamps to date buckets for one interval. */
export type DateRounding = FixedDateRounding | CalendarDateRounding;

const FIXED_UNIT_MS = { ms: 1, s: SECOND_MS, m: MINUTE_MS, h: HOUR_MS } as const;

/**
 * Parse a bucket interval such as `30m`, `12h`, `1d`, `1w` or `3M` with ES|QL `BUCKET` semantics:
 * `1d`, `7d` and `1w` are calendar units (`7d` is an ISO week, like `1w`), other day and week
 * multiples are fixed widths, and month and year multiples are calendar units aligned to January
 * of year 1.
 * Returns `undefined` for anything else.
 */
export const toDateRounding = (expression: string): DateRounding | undefined => {
  const parsed = /^(\d+)(ms|s|m|h|d|w|M|y)$/.exec(expression);
  if (!parsed) {
    return undefined;
  }
  const amount = Number(parsed[1]);
  const unit = parsed[2];
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return undefined;
  }
  switch (unit) {
    case 'ms':
    case 's':
    case 'm':
    case 'h':
      return { kind: 'fixed', widthMs: amount * FIXED_UNIT_MS[unit] };
    case 'd':
      if (amount === 1) {
        return { kind: 'calendar', unit: 'day', amount };
      }
      // ES|QL rounds exactly 7 days like a week: ISO weeks starting on Monday.
      if (amount === 7) {
        return { kind: 'calendar', unit: 'isoWeek', amount: 1 };
      }
      return { kind: 'fixed', widthMs: amount * DAY_MS };
    case 'w':
      return amount === 1
        ? { kind: 'calendar', unit: 'isoWeek', amount }
        : { kind: 'fixed', widthMs: amount * WEEK_MS };
    case 'M':
      return { kind: 'calendar', unit: 'month', amount };
    case 'y':
      return { kind: 'calendar', unit: 'year', amount };
    default:
      return undefined;
  }
};

/** Key of the Elasticsearch date bucket that contains `timestamp` in `timeZone`. */
export const roundToBucketKey = (
  timestamp: number,
  rounding: DateRounding,
  timeZone: IanaTimeZone
): number => {
  const periods = offsetPeriods(timeZone);
  if (rounding.kind === 'fixed') {
    return roundFixed(periods, periodIndexAt(periods, timestamp), timestamp, rounding.widthMs);
  }
  return localDayStart(periods, calendarStart(localDate(periods, timestamp), rounding));
};

/** Key of the Elasticsearch date bucket that follows the bucket containing `timestamp`. */
export const nextBucketKey = (
  timestamp: number,
  rounding: DateRounding,
  timeZone: IanaTimeZone
): number => {
  const periods = offsetPeriods(timeZone);
  if (rounding.kind === 'fixed') {
    const width = rounding.widthMs;
    const key = roundFixed(periods, periodIndexAt(periods, timestamp), timestamp, width);
    const end = fixedBucketEnd(periods, key, width);
    return roundFixed(periods, periodIndexAt(periods, end), end, width);
  }
  const start = calendarStart(localDate(periods, timestamp), rounding);
  const unit = rounding.unit === 'isoWeek' ? 'week' : rounding.unit;
  return localDayStart(periods, start.add(rounding.amount, unit));
};

/**
 * First instant after `key` that rounds to a different key. Inside a constant-offset period
 * the key only changes on a local boundary, so only those and the period ends are probed.
 */
const fixedBucketEnd = (periods: readonly OffsetPeriod[], key: number, width: number): number => {
  let cursor = key;
  for (;;) {
    const { end, offsetMs } = periods[periodIndexAt(periods, cursor)];
    cursor = Math.min(localFloor(cursor, offsetMs, width) + width - offsetMs, end);
    if (roundFixed(periods, periodIndexAt(periods, cursor), cursor, width) !== key) {
      return cursor;
    }
  }
};

/** Local time of `utcMillis` at `offsetMs`, rounded down to a multiple of `width`. */
const localFloor = (utcMillis: number, offsetMs: number, width: number): number =>
  Math.floor((utcMillis + offsetMs) / width) * width;

/**
 * ES `TimeIntervalRounding` in a zone with offset changes: round the local time down, then map it
 * back to UTC. A rounded local time skipped by a forward jump maps to the transition instant; one
 * that only exists before the transition rounds the last instant before it instead.
 */
const roundFixed = (
  periods: readonly OffsetPeriod[],
  index: number,
  utcMillis: number,
  width: number
): number => {
  const { start, offsetMs } = periods[index];
  const roundedLocal = localFloor(utcMillis, offsetMs, width);
  const rounded = roundedLocal - offsetMs;
  if (rounded >= start) {
    return rounded;
  }
  return (
    gapTransitionAt(periods, index, roundedLocal) ??
    roundFixed(periods, index - 1, start - 1, width)
  );
};

/** Start of the forward transition at or before `periods[index]` whose skipped local times contain `localMillis`. */
const gapTransitionAt = (
  periods: readonly OffsetPeriod[],
  index: number,
  localMillis: number
): number | undefined => {
  for (let i = index; i > 0; i--) {
    const { start, offsetMs } = periods[i];
    if (localMillis >= start + offsetMs) {
      return undefined;
    }
    if (localMillis >= start + periods[i - 1].offsetMs) {
      return start;
    }
  }
  return undefined;
};

/** Local calendar date of `utcMillis`, as a UTC moment so date math ignores offsets. */
const localDate = (periods: readonly OffsetPeriod[], utcMillis: number): moment.Moment => {
  const { offsetMs } = periods[periodIndexAt(periods, utcMillis)];
  return moment.utc(utcMillis + offsetMs).startOf('day');
};

/** First local date of the calendar bucket containing `date`; month and year multiples count from `ANCHOR_YEAR`. */
const calendarStart = (date: moment.Moment, rounding: CalendarDateRounding): moment.Moment => {
  const { unit, amount } = rounding;
  if (unit === 'day') {
    return date.clone();
  }
  if (unit === 'isoWeek') {
    return date.clone().startOf('isoWeek');
  }
  if (unit === 'month') {
    const monthsSinceAnchor = (date.year() - ANCHOR_YEAR) * 12 + date.month();
    const aligned = Math.floor(monthsSinceAnchor / amount) * amount;
    const alignedMonth = ((aligned % 12) + 12) % 12;
    return moment.utc([ANCHOR_YEAR + Math.floor(aligned / 12), alignedMonth, 1]);
  }
  const alignedYear = ANCHOR_YEAR + Math.floor((date.year() - ANCHOR_YEAR) / amount) * amount;
  return moment.utc([alignedYear, 0, 1]);
};

/**
 * First instant of the local midnight `date`, like ES calendar rounding: the earlier instant when
 * midnight repeats, the transition instant when a forward jump skips it.
 */
const localDayStart = (periods: readonly OffsetPeriod[], date: moment.Moment): number => {
  const localMillis = date.valueOf();
  for (let i = periodIndexAt(periods, localMillis - DAY_MS); i < periods.length; i++) {
    const { start, end, offsetMs } = periods[i];
    const utcMillis = localMillis - offsetMs;
    if (utcMillis < start) {
      return start;
    }
    if (utcMillis < end) {
      return utcMillis;
    }
  }
  return localMillis - periods[periods.length - 1].offsetMs;
};
