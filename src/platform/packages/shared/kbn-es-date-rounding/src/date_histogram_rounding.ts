/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DateRounding } from './date_rounding';

/** The interval parameter of a DSL `date_histogram` aggregation. */
export type DateHistogramInterval =
  | { readonly calendar_interval: string }
  | { readonly fixed_interval: string };

const MINUTE_MS = 6e4;
const HOUR_MS = 36e5;

const FIXED_UNIT_MS: Readonly<Record<string, number>> = {
  ms: 1,
  s: 1e3,
  m: MINUTE_MS,
  h: HOUR_MS,
  d: 864e5,
};

// Calendar minutes and hours start on local minute and hour boundaries, like fixed widths.
const CALENDAR_INTERVALS: Readonly<Record<string, DateRounding>> = {
  '1m': { kind: 'fixed', widthMs: MINUTE_MS },
  minute: { kind: 'fixed', widthMs: MINUTE_MS },
  '1h': { kind: 'fixed', widthMs: HOUR_MS },
  hour: { kind: 'fixed', widthMs: HOUR_MS },
  '1d': { kind: 'calendar', unit: 'day', amount: 1 },
  day: { kind: 'calendar', unit: 'day', amount: 1 },
  '1w': { kind: 'calendar', unit: 'isoWeek', amount: 1 },
  week: { kind: 'calendar', unit: 'isoWeek', amount: 1 },
  '1M': { kind: 'calendar', unit: 'month', amount: 1 },
  month: { kind: 'calendar', unit: 'month', amount: 1 },
  '1q': { kind: 'calendar', unit: 'month', amount: 3 },
  quarter: { kind: 'calendar', unit: 'month', amount: 3 },
  '1y': { kind: 'calendar', unit: 'year', amount: 1 },
  year: { kind: 'calendar', unit: 'year', amount: 1 },
};

/**
 * Rounding for a DSL `date_histogram` interval. The parameter decides the rounding, so
 * `calendar_interval: 1d` is a calendar day while `fixed_interval: 1d` is a fixed 24 hours.
 * Returns `undefined` for intervals `date_histogram` rejects, such as `calendar_interval: 3M`.
 */
export const toDslDateRounding = (interval: DateHistogramInterval): DateRounding | undefined => {
  if ('calendar_interval' in interval) {
    return CALENDAR_INTERVALS[interval.calendar_interval];
  }
  const parsed = /^(\d+)(ms|s|m|h|d)$/.exec(interval.fixed_interval);
  if (!parsed) {
    return undefined;
  }
  const [, amountText, unit] = parsed;
  const amount = Number(amountText);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return undefined;
  }
  return { kind: 'fixed', widthMs: amount * FIXED_UNIT_MS[unit] };
};
