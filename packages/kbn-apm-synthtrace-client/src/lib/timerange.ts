/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import datemath from '@kbn/datemath';
import type { Moment } from 'moment';
import { GaussianEvents } from './gaussian_events';
import { Interval } from './interval';
import { PoissonEvents } from './poisson_events';

export class Timerange {
  constructor(public readonly from: Date, public readonly to: Date) {}

  interval(interval: string) {
    return new Interval({ from: this.from, to: this.to, interval });
  }

  ratePerMinute(rate: number) {
    return this.interval(`1m`).rate(rate);
  }

  poissonEvents(rate: number) {
    return new PoissonEvents(this.from, this.to, rate);
  }

  gaussianEvents(mean: Date, width: number, totalPoints: number) {
    return new GaussianEvents(this.from, this.to, mean, width, totalPoints);
  }

  splitInto(segmentCount: number): Timerange[] {
    const duration = this.to.getTime() - this.from.getTime();
    const segmentDuration = duration / segmentCount;

    return Array.from({ length: segmentCount }, (_, i) => {
      const from = new Date(this.from.getTime() + i * segmentDuration);
      const to = new Date(from.getTime() + segmentDuration);
      return new Timerange(from, to);
    });
  }

  toString() {
    return `Timerange(from=${this.from.toISOString()}, to=${this.to.toISOString()})`;
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
