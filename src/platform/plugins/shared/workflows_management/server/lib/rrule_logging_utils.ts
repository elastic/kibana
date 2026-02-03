/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Maps RRule frequency enum values to human-readable strings
 */
export const RRULE_FREQUENCY_MAP: Record<number, string> = {
  0: 'YEARLY',
  1: 'MONTHLY',
  2: 'WEEKLY',
  3: 'DAILY',
  4: 'HOURLY',
  5: 'MINUTELY',
  6: 'SECONDLY',
};

export const RRULE_FREQUENCY_REVERSE_MAP: Record<string, number> = {
  YEARLY: 0,
  MONTHLY: 1,
  WEEKLY: 2,
  DAILY: 3,
  HOURLY: 4,
  MINUTELY: 5,
  SECONDLY: 6,
};

/**
 * Maps RRule frequency enum values to human-readable strings
 */
export const RRULE_INTERVAL_MAP: Record<number, string> = {
  0: 'year',
  1: 'month',
  2: 'week',
  3: 'day',
  4: 'hour',
  5: 'minute',
  6: 'second',
};

/**
 * Converts RRule frequency enum to readable string
 */
export function getReadableFrequency(freq: number): string {
  return RRULE_FREQUENCY_MAP[freq] || `FREQ_${freq}`;
}

/**
 * Converts RRule interval enum to readable string
 */
export function getReadableInterval(freq: number, interval: number): string {
  const intervalText = RRULE_INTERVAL_MAP[freq] || `${freq}_interval`;
  return pluralize(interval, intervalText);
}

function pluralize(count: number, singularText: string, pluralText?: string) {
  return count === 1 ? singularText : !pluralText ? `${singularText}s` : pluralText;
}
