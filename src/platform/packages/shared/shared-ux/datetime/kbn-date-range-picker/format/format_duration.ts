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
  months: 'mos',
  weeks: 'w',
  days: 'd',
  hours: 'h',
  minutes: 'min',
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

/**
 * Converts a duration between two dates into a short display string.
 * For example: "20min", "3d", "~1h"
 */
export function durationToDisplayShortText(startDate: Date, endDate: Date): string {
  const diff = Math.abs(endDate.getTime() - startDate.getTime());
  if (diff <= 0) {
    return `0${UNIT_ABBREV.seconds}`;
  }
  if (diff < MS_PER.second) {
    return `${Math.round(diff)}${UNIT_ABBREV.milliseconds}`;
  }

  const matched = UNIT_THRESHOLDS.find((entry) => diff >= entry.threshold);
  if (!matched) {
    return `${Math.floor(diff / MS_PER.second)}${UNIT_ABBREV.seconds}`;
  }

  const { unit } = matched;
  const value = diff / matched.divisor;

  const allowHalfStepDecimal = value < 10 && unit === 'years';
  const formattedValue = allowHalfStepDecimal ? roundToHalf(value) : Math.round(value);
  const deviationMs = Math.abs(diff - formattedValue * UNIT_MS[unit]);
  const showAsApproximation = deviationMs >= DEVIATION_THRESHOLDS_MS[unit];

  return `${showAsApproximation ? '~' : ''}${formattedValue}${UNIT_ABBREV[unit]}`;
}
