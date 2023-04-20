/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import datemath from '@kbn/datemath';
import type { Moment } from 'moment';
import { Interval } from './interval';

export class Timerange {
  constructor(private from: Date, private to: Date) {}

  interval(interval: string) {
    return new Interval({ from: this.from, to: this.to, interval });
  }

  ratePerMinute(ratePerMin: number) {
    const intervalPerSecond = Math.max(1, 60 / ratePerMin);

    // rate per second
    let interval = `${intervalPerSecond}s`;
    let rate = (ratePerMin / 60) * intervalPerSecond;

    // rate per minute
    if (!Number.isInteger(rate) || !Number.isInteger(intervalPerSecond)) {
      interval = '1m';
      rate = rate * 60;
    }

    return this.interval(interval).rate(rate);
  }
}

type DateLike = Date | number | Moment | string;

function getDateFrom(date: DateLike, now: Date): Date {
  if (date instanceof Date) return date;

  if (typeof date === 'string') {
    const parsed = datemath.parse(date, { forceNow: now });
    if (parsed && parsed.isValid()) {
      return parsed.toDate();
    }
  }

  if (typeof date === 'number' || typeof date === 'string') return new Date(date);

  return date.toDate();
}

export function timerange(from: DateLike, to: DateLike) {
  const now = new Date();
  return new Timerange(getDateFrom(from, now), getDateFrom(to, now));
}
