/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment, { unitOfTime } from 'moment';
import { random } from 'lodash';
import { EntityIterable } from './entity_iterable';
import { EntityGenerator } from './entity_generator';
import { Serializable } from './serializable';

export function parseInterval(interval: string): [number, unitOfTime.DurationConstructor] {
  const args = interval.match(/(\d+)(s|m|h|d)/);
  if (!args || args.length < 3) {
    throw new Error('Failed to parse interval');
  }
  return [Number(args[1]), args[2] as any];
}

export interface IntervalOptions {
  from: Date;
  to: Date;
  interval: string;
  yieldRate?: number;

  intervalUpper?: number;
  rateUpper?: number;
}

export class Interval implements Iterable<number> {
  constructor(public readonly options: IntervalOptions) {
    const parsed = parseInterval(options.interval);
    this.intervalAmount = parsed[0];
    this.intervalUnit = parsed[1];
    this.from = this.options.from;
    this.to = this.options.to;
  }
  public readonly from: Date;
  public readonly to: Date;

  private readonly intervalAmount: number;
  private readonly intervalUnit: unitOfTime.DurationConstructor;
  generator<TField>(
    map: (timestamp: number, index?: number) => Serializable<TField> | Array<Serializable<TField>>
  ): EntityIterable<TField> {
    return new EntityGenerator(this, function* (i) {
      let index = 0;
      for (const x of i) {
        const data = map(x, index);
        if (Array.isArray(data)) {
          yield* data;
        } else {
          yield data;
        }
        index++;
      }
    });
  }
  rate(rate: number): Interval {
    return new Interval({ ...this.options, yieldRate: rate });
  }

  randomize(rateUpper: number, intervalUpper: number): Interval {
    return new Interval({ ...this.options, intervalUpper, rateUpper });
  }

  ratePerMinute(): number {
    const rate = this.options.rateUpper
      ? Math.max(1, this.options.rateUpper)
      : this.options.yieldRate ?? 1;

    const interval = this.options.intervalUpper ? this.options.intervalUpper : this.intervalAmount;
    const first = moment();
    const last = moment(first).subtract(interval, this.intervalUnit);
    const numberOfMinutes =
      (Math.abs(last.toDate().getTime() - first.toDate().getTime()) / (1000 * 60)) % 60;
    return rate / numberOfMinutes;
  }

  private yieldRateTimestamps(timestamp: number) {
    const rate = this.options.rateUpper
      ? random(this.options.yieldRate ?? 1, Math.max(1, this.options.rateUpper))
      : this.options.yieldRate ?? 1;
    return new Array<number>(rate).fill(timestamp);
  }

  private *_generate(): Iterable<number> {
    if (this.from > this.to) {
      let now = this.from;
      do {
        yield* this.yieldRateTimestamps(now.getTime());
        const amount = this.interval();
        now = new Date(moment(now).subtract(amount, this.intervalUnit).valueOf());
      } while (now > this.to);
    } else {
      let now = this.from;
      do {
        yield* this.yieldRateTimestamps(now.getTime());
        const amount = this.interval();
        now = new Date(moment(now).add(amount, this.intervalUnit).valueOf());
      } while (now < this.to);
    }
  }

  private interval() {
    return this.options.intervalUpper
      ? random(this.intervalAmount, this.options.intervalUpper)
      : this.intervalAmount;
  }

  [Symbol.iterator]() {
    return this._generate()[Symbol.iterator]();
  }
}
