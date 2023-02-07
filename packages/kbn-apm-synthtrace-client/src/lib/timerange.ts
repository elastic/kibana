/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Moment } from 'moment';
import { Interval } from './interval';

export class Timerange {
  constructor(private from: Date, private to: Date) {}

  interval(interval: string) {
    return new Interval({ from: this.from, to: this.to, interval });
  }

  ratePerMinute(rate: number) {
    return this.interval(`1m`).rate(rate);
  }
}

type DateLike = Date | number | Moment | string;

function getDateFrom(date: DateLike): Date {
  if (date instanceof Date) return date;
  if (typeof date === 'number' || typeof date === 'string') return new Date(date);
  return date.toDate();
}

export function timerange(from: Date | number | Moment, to: Date | number | Moment) {
  return new Timerange(getDateFrom(from), getDateFrom(to));
}
