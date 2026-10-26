/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';

export type IanaTimeZone = string & { readonly __ianaTimeZone: unique symbol };

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

const DAY_MS = 864e5;
const WEEK_MS = 6048e5;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

const DST_WALK_CAP = 1_000_000;

type CalendarAdd = 'day' | 'week' | 'month' | 'year';
type CalendarStartOf = 'day' | 'isoWeek' | 'month' | 'year';
type FixedUnit = 'millisecond' | 'second' | 'minute' | 'hour';

interface CalendarInterval extends DateInterval {
  readonly kind: 'calendar';
  readonly startOf: CalendarStartOf;
  readonly add: CalendarAdd;
  readonly amount: number;
}

interface FixedInterval extends DateInterval {
  readonly kind: 'fixed';
  readonly amount: number;
  readonly unit: FixedUnit;
}

type InternalInterval = CalendarInterval | FixedInterval;

function calendar(
  expression: string,
  startOf: CalendarStartOf,
  add: CalendarAdd,
  nominalMs: number,
  amount = 1
): CalendarInterval {
  return { expression, kind: 'calendar', nominalMs, startOf, add, amount };
}

function fixed(
  expression: string,
  amount: number,
  unit: FixedUnit,
  nominalMs: number
): FixedInterval {
  return { expression, kind: 'fixed', nominalMs, amount, unit };
}

const HOUR_MS = 36e5;
const MINUTE_MS = 6e4;
const SECOND_MS = 1e3;

// Coarse to fine. ES DateRoundingPicker PRIMARY_UNITS: 1d is calendar; 1h is a fixed TimeValue.
const PRIMARY: readonly InternalInterval[] = [
  calendar('1d', 'day', 'day', DAY_MS),
  fixed('12h', 12, 'hour', 12 * HOUR_MS),
  fixed('3h', 3, 'hour', 3 * HOUR_MS),
  fixed('1h', 1, 'hour', HOUR_MS),
  fixed('30m', 30, 'minute', 30 * MINUTE_MS),
  fixed('10m', 10, 'minute', 10 * MINUTE_MS),
  fixed('5m', 5, 'minute', 5 * MINUTE_MS),
  fixed('1m', 1, 'minute', MINUTE_MS),
  fixed('30s', 30, 'second', 30 * SECOND_MS),
  fixed('10s', 10, 'second', 10 * SECOND_MS),
  fixed('5s', 5, 'second', 5 * SECOND_MS),
  fixed('1s', 1, 'second', SECOND_MS),
  fixed('100ms', 100, 'millisecond', 100),
  fixed('50ms', 50, 'millisecond', 50),
  fixed('10ms', 10, 'millisecond', 10),
  fixed('1ms', 1, 'millisecond', 1),
];

const YEAR = calendar('1y', 'year', 'year', YEAR_MS);

const SECONDARY: readonly InternalInterval[] = [
  calendar('1w', 'isoWeek', 'week', WEEK_MS),
  calendar('1M', 'month', 'month', MONTH_MS),
  YEAR,
];

const BY_EXPRESSION = new Map<string, InternalInterval>(
  [...PRIMARY, ...SECONDARY].map((interval) => [interval.expression, interval])
);

export function ianaTimeZone(id: string): IanaTimeZone {
  if (id === '' || id === 'Browser' || moment.tz.zone(id) == null) {
    throw new Error(`Invalid IANA time zone: ${id}`);
  }
  return id as IanaTimeZone;
}

/** Parse an untrusted zone id. Kibana's `Browser` sentinel becomes the local zone. Empty and unknown ids become UTC. */
export function ianaTimeZoneOrUtc(id: string | undefined): IanaTimeZone {
  const candidate = id === 'Browser' ? moment.tz.guess() : id;
  try {
    return ianaTimeZone(candidate ?? 'UTC');
  } catch {
    return ianaTimeZone('UTC');
  }
}

export function durationAsRange(durationMs: number): { from: 0; to: number } {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('durationMs must be a positive finite number');
  }
  return { from: 0, to: durationMs };
}

export function pickDateRounding(maxBuckets: number, range: ZonedDateRange): DateInterval {
  assertMaxBuckets(maxBuckets);
  assertRange(range);

  let low = 0;
  let high = PRIMARY.length - 1;
  let best: InternalInterval | undefined;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const unit = PRIMARY[mid];
    if (roundingIsOk(unit, range, maxBuckets)) {
      best = unit;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (best) {
    return toPublic(best);
  }
  for (const unit of SECONDARY) {
    if (roundingIsOk(unit, range, maxBuckets)) {
      return toPublic(unit);
    }
  }
  return toPublic(YEAR);
}

export function fitsInBuckets(
  interval: DateInterval,
  range: ZonedDateRange,
  maxBuckets: number
): boolean {
  assertMaxBuckets(maxBuckets);
  assertRange(range);
  return roundingIsOk(resolveInterval(interval), range, maxBuckets);
}

function resolveInterval(interval: DateInterval): InternalInterval {
  const known = BY_EXPRESSION.get(interval.expression);
  if (known) {
    return known;
  }
  const parsed = /^(\d+)(ms|s|m|h|d|w|M|y)$/.exec(interval.expression);
  if (!parsed) {
    throw new Error(`Unknown date interval expression: ${interval.expression}`);
  }
  const amount = Number(parsed[1]);
  const suffix = parsed[2];
  if (interval.kind === 'calendar') {
    const calendarUnit =
      suffix === 'd'
        ? calendar(interval.expression, 'day', 'day', amount * DAY_MS, amount)
        : suffix === 'w'
        ? calendar(interval.expression, 'isoWeek', 'week', amount * WEEK_MS, amount)
        : suffix === 'M'
        ? calendar(interval.expression, 'month', 'month', amount * MONTH_MS, amount)
        : suffix === 'y'
        ? calendar(interval.expression, 'year', 'year', amount * YEAR_MS, amount)
        : undefined;
    if (!calendarUnit) {
      throw new Error(`Unknown date interval expression: ${interval.expression}`);
    }
    return calendarUnit;
  }
  switch (suffix) {
    case 'ms':
      return fixed(interval.expression, amount, 'millisecond', amount);
    case 's':
      return fixed(interval.expression, amount, 'second', amount * SECOND_MS);
    case 'm':
      return fixed(interval.expression, amount, 'minute', amount * MINUTE_MS);
    case 'h':
      return fixed(interval.expression, amount, 'hour', amount * HOUR_MS);
    case 'd':
      return fixed(interval.expression, amount * 24, 'hour', amount * DAY_MS);
    default:
      throw new Error(`Unknown date interval expression: ${interval.expression}`);
  }
}

function roundingIsOk(
  interval: InternalInterval,
  range: ZonedDateRange,
  maxBuckets: number
): boolean {
  return interval.kind === 'calendar'
    ? calendarFits(interval, range, maxBuckets)
    : fixedFits(interval, range, maxBuckets);
}

function calendarFits(
  interval: CalendarInterval,
  range: ZonedDateRange,
  maxBuckets: number
): boolean {
  let cursor = alignCalendar(range.from, interval, range.timeZone);
  let count = 0;
  while (cursor < range.to) {
    count += 1;
    if (count > maxBuckets) {
      return false;
    }
    cursor = moment.tz(cursor, range.timeZone).add(interval.amount, interval.add).valueOf();
  }
  return true;
}

function fixedFits(interval: FixedInterval, range: ZonedDateRange, maxBuckets: number): boolean {
  const width = interval.nominalMs;
  // Match ES DateRoundingPicker.roundingIsOkFixedWidthUnit: count arithmetically
  // inside a constant-offset period, then realign on the post-transition offset.
  let boundary = alignFixed(range.from, interval, range.timeZone);
  let count = 0;
  let iterations = 0;
  while (boundary < range.to) {
    iterations += 1;
    if (iterations > DST_WALK_CAP) {
      return false;
    }
    const transition = nextTransitionAfter(boundary, range.timeZone);
    const periodEnd = transition ?? Number.POSITIVE_INFINITY;
    const limit = Math.min(periodEnd, range.to);
    const inPeriod = Math.floor((limit - boundary + width - 1) / width);
    if (inPeriod < 1) {
      return false;
    }
    count += inPeriod;
    if (count > maxBuckets) {
      return false;
    }
    if (periodEnd >= range.to) {
      break;
    }
    const next = firstBoundaryOnOrAfter(periodEnd, interval, range.timeZone);
    if (next <= boundary) {
      return false;
    }
    boundary = next;
  }
  return true;
}

function alignCalendar(from: number, interval: CalendarInterval, timeZone: IanaTimeZone): number {
  return moment.tz(from, timeZone).startOf(interval.startOf).valueOf();
}

function alignFixed(from: number, interval: FixedInterval, timeZone: IanaTimeZone): number {
  const width = interval.nominalMs;
  const offsetMs = moment.tz(from, timeZone).utcOffset() * 60 * 1000;
  const local = from + offsetMs;
  const localOffset = ((local % width) + width) % width;
  return from - localOffset;
}

function nextTransitionAfter(utcMillis: number, timeZone: IanaTimeZone): number | undefined {
  const zone = moment.tz.zone(timeZone);
  if (zone == null) {
    return undefined;
  }
  return zone.untils.find((until) => Number.isFinite(until) && until > utcMillis);
}

function firstBoundaryOnOrAfter(
  utcMillis: number,
  interval: FixedInterval,
  timeZone: IanaTimeZone
): number {
  const rounded = alignFixed(utcMillis, interval, timeZone);
  return rounded < utcMillis ? rounded + interval.nominalMs : rounded;
}

function toPublic(interval: InternalInterval): DateInterval {
  return {
    expression: interval.expression,
    kind: interval.kind,
    nominalMs: interval.nominalMs,
  };
}

function assertMaxBuckets(maxBuckets: number): void {
  if (!Number.isInteger(maxBuckets) || maxBuckets <= 0) {
    throw new Error('maxBuckets must be a positive integer');
  }
}

function assertRange(range: ZonedDateRange): void {
  if (!Number.isFinite(range.from) || !Number.isFinite(range.to) || range.from >= range.to) {
    throw new Error('range.from must be finite and less than range.to');
  }
}
