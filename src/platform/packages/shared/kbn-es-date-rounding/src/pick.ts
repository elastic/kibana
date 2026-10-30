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

/**
 * Brand a known IANA zone id.
 * @throws {Error} If `id` is empty, `Browser`, or not a known IANA zone.
 */
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

/**
 * Epoch range `[0, durationMs)` for callers that only have a duration.
 * @throws {Error} If `durationMs` is not a positive finite number.
 */
export function durationAsRange(durationMs: number): { from: 0; to: number } {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('durationMs must be a positive finite number');
  }
  return { from: 0, to: durationMs };
}

/**
 * Finest ES DateRoundingPicker interval that produces at most `maxBuckets` in `range`.
 * Searches the day→1ms primary ladder, then falls back through week, month, and year.
 * @throws {Error} If `maxBuckets` is not a positive integer, or `range.from` is not finite and less than `range.to`.
 */
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

/**
 * Whether `interval` stays within `maxBuckets` over `range`, using the picker's zoned count.
 * @throws {Error} If `maxBuckets` is not a positive integer, `range` is invalid, or `interval.expression` is unknown.
 */
export function fitsInBuckets(
  interval: DateInterval,
  range: ZonedDateRange,
  maxBuckets: number
): boolean {
  assertMaxBuckets(maxBuckets);
  assertRange(range);
  return roundingIsOk(resolveInterval(interval), range, maxBuckets);
}

/** Resolve a public interval onto the picker ladder, or parse a manual `Nm`/`Nh`/… expression. */
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

/** True when the interval's zoned buckets from `range.from` to `range.to` stay within `maxBuckets`. */
function roundingIsOk(
  interval: InternalInterval,
  range: ZonedDateRange,
  maxBuckets: number
): boolean {
  return interval.kind === 'calendar'
    ? calendarFits(interval, range, maxBuckets)
    : fixedFits(interval, range, maxBuckets);
}

/** Walk calendar start-of-unit boundaries in `range.timeZone` (day/week/month/year lengths vary). */
function calendarFits(
  interval: CalendarInterval,
  range: ZonedDateRange,
  maxBuckets: number
): boolean {
  const periods = offsetPeriods(range.timeZone);
  let cursor = localDayStart(periods, localDate(periods, range.from).startOf(interval.startOf));
  let count = 0;
  while (cursor < range.to) {
    count += 1;
    if (count > maxBuckets) {
      return false;
    }
    cursor = localDayStart(periods, localDate(periods, cursor).add(interval.amount, interval.add));
  }
  return true;
}

/** Local calendar date of `utcMillis`, as a UTC moment so date math ignores offsets. */
function localDate(periods: readonly OffsetPeriod[], utcMillis: number): moment.Moment {
  const { offsetMs } = periods[periodIndexAt(periods, utcMillis)];
  return moment.utc(utcMillis + offsetMs).startOf('day');
}

/**
 * First instant of the local midnight `date`, like ES calendar rounding: the earlier instant when
 * midnight repeats, the transition instant when a forward jump skips it.
 */
function localDayStart(periods: readonly OffsetPeriod[], date: moment.Moment): number {
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
}

/**
 * Count the distinct bucket keys that ES `fixed_interval` + `time_zone` rounding assigns to
 * instants in `[range.from, range.to)`. Keys are walked one by one around offset changes; inside a
 * constant-offset period every local boundary is a key, so those are counted arithmetically.
 */
function fixedFits(interval: FixedInterval, range: ZonedDateRange, maxBuckets: number): boolean {
  const width = interval.nominalMs;
  const periods = offsetPeriods(range.timeZone);
  let index = periodIndexAt(periods, range.from);
  let cursor = range.from;
  let key = roundFixed(periods, index, cursor, width);
  let count = 1;
  while (count <= maxBuckets) {
    const { end, offsetMs } = periods[index];
    if (key === cursor && localFloor(cursor, offsetMs, width) === cursor + offsetMs) {
      const boundariesBeforeLimit = Math.ceil((Math.min(end, range.to) - cursor) / width) - 1;
      count += boundariesBeforeLimit;
      cursor += boundariesBeforeLimit * width;
      key = cursor;
    }
    cursor = Math.min(localFloor(cursor, offsetMs, width) + width - offsetMs, end);
    if (cursor >= range.to) {
      return count <= maxBuckets;
    }
    if (cursor === end) {
      index += 1;
    }
    const next = roundFixed(periods, index, cursor, width);
    if (next !== key) {
      count += 1;
      key = next;
    }
  }
  return false;
}

/** Local time of `utcMillis` at `offsetMs`, rounded down to a multiple of `width`. */
function localFloor(utcMillis: number, offsetMs: number, width: number): number {
  return Math.floor((utcMillis + offsetMs) / width) * width;
}

/**
 * ES `TimeIntervalRounding` in a zone with offset changes: round the local time down, then map it
 * back to UTC. A rounded local time skipped by a forward jump maps to the transition instant; one
 * that only exists before the transition rounds the last instant before it instead.
 */
function roundFixed(
  periods: readonly OffsetPeriod[],
  index: number,
  utcMillis: number,
  width: number
): number {
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
}

/** Start of the forward transition at or before `periods[index]` whose skipped local times contain `localMillis`. */
function gapTransitionAt(
  periods: readonly OffsetPeriod[],
  index: number,
  localMillis: number
): number | undefined {
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
}

interface OffsetPeriod {
  readonly start: number;
  readonly end: number;
  readonly offsetMs: number;
}

const OFFSET_PERIODS = new Map<IanaTimeZone, readonly OffsetPeriod[]>();

/** Contiguous `[start, end)` UTC spans of `timeZone` with a constant offset, covering all instants. */
function offsetPeriods(timeZone: IanaTimeZone): readonly OffsetPeriod[] {
  const cached = OFFSET_PERIODS.get(timeZone);
  if (cached) {
    return cached;
  }
  const zone = moment.tz.zone(timeZone);
  if (zone == null) {
    throw new Error(`Invalid IANA time zone: ${timeZone}`);
  }
  const periods: OffsetPeriod[] = [];
  zone.untils.forEach((until, i) => {
    const offsetMs = -zone.offsets[i] * MINUTE_MS;
    const last = periods[periods.length - 1];
    if (last?.offsetMs === offsetMs) {
      periods[periods.length - 1] = { ...last, end: until };
    } else {
      periods.push({ start: last?.end ?? Number.NEGATIVE_INFINITY, end: until, offsetMs });
    }
  });
  OFFSET_PERIODS.set(timeZone, periods);
  return periods;
}

/** Index of the period containing `utcMillis`. */
function periodIndexAt(periods: readonly OffsetPeriod[], utcMillis: number): number {
  let low = 0;
  let high = periods.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (periods[mid].end <= utcMillis) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
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
