/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toDslDateRounding } from './date_histogram_rounding';
import type { DateRounding } from './date_rounding';
import { countBuckets } from './date_rounding';
import type { IanaTimeZone } from './time_zone';

export interface ZonedDateRange {
  readonly from: number;
  readonly to: number;
  readonly timeZone: IanaTimeZone;
}

export interface DateInterval {
  readonly expression: string;
  readonly kind: 'calendar' | 'fixed';
  readonly nominalMs: number;
}

const SECOND_MS = 1e3;
const MINUTE_MS = 6e4;
const HOUR_MS = 36e5;
const DAY_MS = 864e5;
const WEEK_MS = 6048e5;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

const calendar = (expression: string, nominalMs: number): DateInterval => ({
  expression,
  kind: 'calendar',
  nominalMs,
});

const fixed = (expression: string, nominalMs: number): DateInterval => ({
  expression,
  kind: 'fixed',
  nominalMs,
});

// Coarse to fine. ES DateRoundingPicker PRIMARY_UNITS: 1d is calendar; 1h is a fixed TimeValue.
const PRIMARY: readonly DateInterval[] = [
  calendar('1d', DAY_MS),
  fixed('12h', 12 * HOUR_MS),
  fixed('3h', 3 * HOUR_MS),
  fixed('1h', HOUR_MS),
  fixed('30m', 30 * MINUTE_MS),
  fixed('10m', 10 * MINUTE_MS),
  fixed('5m', 5 * MINUTE_MS),
  fixed('1m', MINUTE_MS),
  fixed('30s', 30 * SECOND_MS),
  fixed('10s', 10 * SECOND_MS),
  fixed('5s', 5 * SECOND_MS),
  fixed('1s', SECOND_MS),
  fixed('100ms', 100),
  fixed('50ms', 50),
  fixed('10ms', 10),
  fixed('1ms', 1),
];

const YEAR = calendar('1y', YEAR_MS);

const SECONDARY: readonly DateInterval[] = [
  calendar('1w', WEEK_MS),
  calendar('1M', MONTH_MS),
  YEAR,
];

/**
 * Epoch range `[0, durationMs)` for callers that only have a duration.
 * @throws {Error} If `durationMs` is not a positive finite number.
 */
export const durationAsRange = (durationMs: number): { from: 0; to: number } => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('durationMs must be a positive finite number');
  }
  return { from: 0, to: durationMs };
};

/**
 * Finest ES DateRoundingPicker interval that produces at most `maxBuckets` in `range`.
 * Searches the day→1ms primary ladder, then falls back through week, month, and year.
 * @throws {Error} If `maxBuckets` is not a positive integer, or `range.from` is not finite and less than `range.to`.
 */
export const pickDateRounding = (maxBuckets: number, range: ZonedDateRange): DateInterval => {
  assertMaxBuckets(maxBuckets);
  assertRange(range);

  let low = 0;
  let high = PRIMARY.length - 1;
  let best: DateInterval | undefined;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const interval = PRIMARY[mid];
    if (fitsInRange(toRounding(interval), range, maxBuckets)) {
      best = interval;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (best) {
    return best;
  }
  return SECONDARY.find((interval) => fitsInRange(toRounding(interval), range, maxBuckets)) ?? YEAR;
};

/**
 * Whether `interval` stays within `maxBuckets` over `range`, using the picker's zoned count.
 * @throws {Error} If `maxBuckets` is not a positive integer, `range` is invalid, or `interval.expression` is unknown.
 */
export const fitsInBuckets = (
  interval: DateInterval,
  range: ZonedDateRange,
  maxBuckets: number
): boolean => {
  assertMaxBuckets(maxBuckets);
  assertRange(range);
  return fitsInRange(toRounding(interval), range, maxBuckets);
};

/** Rounding for a picker or manual interval, read as the `date_histogram` parameter it is sent as. */
const toRounding = ({ expression, kind }: DateInterval): DateRounding => {
  const rounding = toDslDateRounding(
    kind === 'calendar' ? { calendar_interval: expression } : { fixed_interval: expression }
  );
  if (!rounding) {
    throw new Error(`Unknown date interval expression: ${expression}`);
  }
  return rounding;
};

const fitsInRange = (
  rounding: DateRounding,
  { from, to, timeZone }: ZonedDateRange,
  maxBuckets: number
): boolean => countBuckets(from, to, rounding, timeZone, maxBuckets) <= maxBuckets;

const assertMaxBuckets = (maxBuckets: number): void => {
  if (!Number.isInteger(maxBuckets) || maxBuckets <= 0) {
    throw new Error('maxBuckets must be a positive integer');
  }
};

const assertRange = (range: ZonedDateRange): void => {
  if (!Number.isFinite(range.from) || !Number.isFinite(range.to) || range.from >= range.to) {
    throw new Error('range.from must be finite and less than range.to');
  }
};
