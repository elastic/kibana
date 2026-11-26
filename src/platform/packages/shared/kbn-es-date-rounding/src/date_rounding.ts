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

/**
 * How Elasticsearch splits time into buckets for one interval: `fixed` buckets have a constant
 * width in local time, `calendar` buckets follow calendar days, weeks, months or years.
 */
export type DateRounding = FixedDateRounding | CalendarDateRounding;

const FIXED_UNIT_MS = { ms: 1, s: SECOND_MS, m: MINUTE_MS, h: HOUR_MS } as const;

/**
 * Parse a bucket interval such as `30m`, `12h`, `1d`, `1w` or `3M` into a `DateRounding`, following
 * the ES|QL `BUCKET` rules:
 * - `ms`, `s`, `m` and `h` are fixed widths;
 * - `1d` is a calendar day, and `1w` and `7d` are calendar ISO weeks (starting on Monday);
 * - any other number of days or weeks is a fixed width;
 * - months and years are calendar units, counted from January of year 1.
 * Returns `undefined` if the expression is not a positive integer followed by one of these units.
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

/**
 * Start of the date bucket containing `timestamp` in `timeZone`, in UTC epoch milliseconds. This is
 * the value Elasticsearch returns as the bucket `key` for the same interval and time zone.
 */
export const roundToBucketKey = (
  timestamp: number,
  rounding: DateRounding,
  timeZone: IanaTimeZone
): number => {
  const periods = offsetPeriods(timeZone);
  if (rounding.kind === 'fixed') {
    return roundFixedAt(periods, timestamp, rounding.widthMs);
  }
  return localDayStart(periods, calendarStart(localDate(periods, timestamp), rounding));
};

/**
 * Start of the bucket right after the one containing `timestamp` (the end of that bucket), in UTC
 * epoch milliseconds. Like `roundToBucketKey`, it matches the bucket boundaries Elasticsearch uses.
 */
export const nextBucketKey = (
  timestamp: number,
  rounding: DateRounding,
  timeZone: IanaTimeZone
): number => {
  const periods = offsetPeriods(timeZone);
  if (rounding.kind === 'fixed') {
    const width = rounding.widthMs;
    const key = roundFixedAt(periods, timestamp, width);
    return roundFixedAt(periods, fixedBucketEnd(periods, key, width), width);
  }
  const start = calendarStart(localDate(periods, timestamp), rounding);
  const unit = rounding.unit === 'isoWeek' ? 'week' : rounding.unit;
  return localDayStart(periods, start.add(rounding.amount, unit));
};

/**
 * End of the fixed-width bucket that starts at `key`: the first instant that belongs to a
 * different bucket. Within a period with a constant offset the bucket can only change at a local
 * multiple of `width` or when the period ends, so only those instants are checked.
 */
const fixedBucketEnd = (periods: readonly OffsetPeriod[], key: number, width: number): number => {
  let candidate = nextFixedBoundary(periods, key, width);
  while (roundFixedAt(periods, candidate, width) === key) {
    candidate = nextFixedBoundary(periods, candidate, width);
  }
  return candidate;
};

/**
 * Next instant after `utcMillis` where the bucket may change: the next local multiple of `width`
 * in the current period, or the end of that period if it comes first.
 */
const nextFixedBoundary = (
  periods: readonly OffsetPeriod[],
  utcMillis: number,
  width: number
): number => {
  const { end, offsetMs } = periods[periodIndexAt(periods, utcMillis)];
  return Math.min(localFloor(utcMillis, offsetMs, width) + width - offsetMs, end);
};

const roundFixedAt = (periods: readonly OffsetPeriod[], utcMillis: number, width: number): number =>
  roundFixed(periods, periodIndexAt(periods, utcMillis), utcMillis, width);

/** Local time of `utcMillis` for a zone offset of `offsetMs`, rounded down to a multiple of `width`. */
const localFloor = (utcMillis: number, offsetMs: number, width: number): number =>
  Math.floor((utcMillis + offsetMs) / width) * width;

/**
 * Start of the fixed-width bucket containing `utcMillis`, which lies in `periods[index]`. Like ES
 * `TimeIntervalRounding`, it rounds the local time down to a multiple of `width` and converts the
 * result back to UTC. If that instant is before the period starts, the rounded local time either
 * was skipped by a forward clock jump (the bucket starts at the jump) or only existed before the
 * transition (the bucket is the one containing the last instant before it).
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

/**
 * Start of the nearest forward clock jump, at or before `periods[index]`, that skips the local time
 * `localMillis`; `undefined` if that local time was not skipped.
 */
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

/**
 * Local calendar date of `utcMillis` in the zone described by `periods`, at local midnight. It is
 * returned as a UTC moment so that date math is not affected by the zone's offset changes.
 */
const localDate = (periods: readonly OffsetPeriod[], utcMillis: number): moment.Moment => {
  const { offsetMs } = periods[periodIndexAt(periods, utcMillis)];
  return moment.utc(utcMillis + offsetMs).startOf('day');
};

/**
 * First local date of the calendar bucket that contains `date`. Month and year buckets of more
 * than one unit are counted from `ANCHOR_YEAR`, so `3M` buckets start in January, April, July and October.
 */
const calendarStart = (date: moment.Moment, rounding: CalendarDateRounding): moment.Moment => {
  const { unit, amount } = rounding;
  if (unit === 'day') {
    return date.clone().startOf('day');
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
 * UTC instant at which the local date `date` starts, like ES calendar rounding. If local midnight
 * happens twice (clock set back), the first one is used; if a forward clock jump skips it, the
 * date starts at the jump.
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
