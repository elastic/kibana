/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import type { IanaTimeZone } from './time_zone';

export interface OffsetPeriod {
  readonly start: number;
  readonly end: number;
  readonly offsetMs: number;
}

const MINUTE_MS = 6e4;

const OFFSET_PERIODS = new Map<IanaTimeZone, readonly OffsetPeriod[]>();

/** Contiguous `[start, end)` UTC spans of `timeZone` with a constant offset, covering all instants. */
export const offsetPeriods = (timeZone: IanaTimeZone): readonly OffsetPeriod[] => {
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
};

/** Index of the period containing `utcMillis`. */
export const periodIndexAt = (periods: readonly OffsetPeriod[], utcMillis: number): number => {
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
};
