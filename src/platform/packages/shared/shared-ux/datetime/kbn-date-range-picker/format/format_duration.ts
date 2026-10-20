/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const UNIT_ABBREV = {
  years: 'y',
  months: 'mo',
  weeks: 'w',
  days: 'd',
  hours: 'h',
  minutes: 'm',
  seconds: 's',
  milliseconds: 'ms',
} as const;

export const MS_PER = {
  second: 1000,
  minute: 1000 * 60,
  hour: 1000 * 60 * 60,
  day: 1000 * 60 * 60 * 24,
  week: 1000 * 60 * 60 * 24 * 7,
  month: 1000 * 60 * 60 * 24 * 30.44, // average days per month
  year: 1000 * 60 * 60 * 24 * 365,
} as const;

type RoundedUnit = 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes';
type DurationUnit = RoundedUnit | 'seconds' | 'milliseconds';

const DEVIATION_THRESHOLDS_MS: Record<RoundedUnit, number> = {
  years: 3 * MS_PER.day,
  months: 1 * MS_PER.day,
  weeks: MS_PER.day,
  days: MS_PER.hour,
  hours: MS_PER.minute,
  minutes: MS_PER.second,
};

const UNIT_MS: Record<RoundedUnit, number> = {
  years: MS_PER.year,
  months: MS_PER.month,
  weeks: MS_PER.week,
  days: MS_PER.day,
  hours: MS_PER.hour,
  minutes: MS_PER.minute,
};

/**
 * Ordered list of unit thresholds for the duration display.
 *
 * 1. Order matters -- the array is searched top-to-bottom, so largest units come first.
 * 2. Each threshold subtracts half the next-smaller unit to create a rounding boundary
 *    (e.g. `MS_PER.year - MS_PER.month / 2` so that 11.5+ months rounds up to "1y").
 */
const UNIT_THRESHOLDS: Array<{ unit: RoundedUnit; threshold: number; divisor: number }> = [
  { unit: 'years', threshold: MS_PER.year - MS_PER.month / 2, divisor: MS_PER.year },
  { unit: 'months', threshold: MS_PER.month - MS_PER.week / 2, divisor: MS_PER.month },
  { unit: 'weeks', threshold: MS_PER.week - MS_PER.day / 2, divisor: MS_PER.week },
  { unit: 'days', threshold: MS_PER.day - MS_PER.hour / 2, divisor: MS_PER.day },
  { unit: 'hours', threshold: MS_PER.hour - MS_PER.minute / 2, divisor: MS_PER.hour },
  { unit: 'minutes', threshold: MS_PER.minute, divisor: MS_PER.minute },
];

const roundToHalf = (value: number) => Math.round(value * 2) / 2;

interface ResolvedDuration {
  unit: DurationUnit;
  value: number;
  isApproximate: boolean;
}

/** Picks the best display unit for a duration and rounds its value, flagging lossy rounding. */
function resolveDurationUnit(diffMs: number): ResolvedDuration {
  if (diffMs <= 0) {
    return { unit: 'seconds', value: 0, isApproximate: false };
  }
  if (diffMs < MS_PER.second) {
    return { unit: 'milliseconds', value: Math.round(diffMs), isApproximate: false };
  }

  const matched = UNIT_THRESHOLDS.find((entry) => diffMs >= entry.threshold);
  if (!matched) {
    return { unit: 'seconds', value: Math.floor(diffMs / MS_PER.second), isApproximate: false };
  }

  const { unit } = matched;
  const rawValue = diffMs / matched.divisor;

  const allowHalfStepDecimal = rawValue < 10 && unit === 'years';
  const value = allowHalfStepDecimal ? roundToHalf(rawValue) : Math.round(rawValue);
  const deviationMs = Math.abs(diffMs - value * UNIT_MS[unit]);
  const isApproximate = deviationMs >= DEVIATION_THRESHOLDS_MS[unit];

  return { unit, value, isApproximate };
}

/**
 * Converts a duration between two dates into a short display string.
 * For example: "20min", "3d", "~1h"
 */
export function durationToDisplayShortText(startDate: Date, endDate: Date): string {
  const diff = Math.abs(endDate.getTime() - startDate.getTime());
  const { unit, value, isApproximate } = resolveDurationUnit(diff);

  return `${isApproximate ? '~' : ''}${value}${UNIT_ABBREV[unit]}`;
}

const UNIT_SINGULAR: Record<DurationUnit, string> = {
  years: 'year',
  months: 'month',
  weeks: 'week',
  days: 'day',
  hours: 'hour',
  minutes: 'minute',
  seconds: 'second',
  milliseconds: 'millisecond',
};

/**
 * Converts a duration between two dates into a full-words display string.
 * For example: "20 minutes", "3 days", "~1 hour"
 *
 * TODO: translate the output of this function using @kbn/i18n with ICU plural
 * syntax for each unit, same as the relative time text in `format_time_range.ts`.
 * https://github.com/elastic/eui-private/issues/534
 */
export function durationToDisplayFullText(startDate: Date, endDate: Date): string {
  const diff = Math.abs(endDate.getTime() - startDate.getTime());
  const { unit, value, isApproximate } = resolveDurationUnit(diff);
  const unitName = value === 1 ? UNIT_SINGULAR[unit] : unit;

  return `${isApproximate ? '~' : ''}${value} ${unitName}`;
}
