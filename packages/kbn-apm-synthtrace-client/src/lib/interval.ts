/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castArray } from 'lodash';
import moment, { unitOfTime } from 'moment';
import { SynthtraceGenerator } from '../types';
import { Fields } from './entity';
import { Serializable } from './serializable';

export function parseInterval(interval: string): {
  intervalAmount: number;
  intervalUnit: unitOfTime.DurationConstructor;
} {
  const args = interval.match(/(\d+)(s|m|h|d)/);
  if (!args || args.length < 3) {
    throw new Error('Failed to parse interval');
  }
  return {
    intervalAmount: Number(args[1]),
    intervalUnit: args[2] as unitOfTime.DurationConstructor,
  };
}

interface IntervalOptions {
  from: Date;
  to: Date;
  interval: string;
  rate?: number;
}

export class Interval<TFields extends Fields = Fields> {
  private readonly intervalAmount: number;
  private readonly intervalUnit: unitOfTime.DurationConstructor;

  private readonly _rate: number;
  constructor(private readonly options: IntervalOptions) {
    const { intervalAmount, intervalUnit } = parseInterval(options.interval);
    this.intervalAmount = intervalAmount;
    this.intervalUnit = intervalUnit;
    this._rate = options.rate || 1;
  }

  private getTimestamps() {
    const from = this.options.from.getTime();
    const to = this.options.to.getTime();

    let time: number = from;
    const diff = moment.duration(this.intervalAmount, this.intervalUnit).asMilliseconds();

    const timestamps: number[] = [];

    const rates = new Array(this._rate);

    while (time < to) {
      timestamps.push(...rates.fill(time));
      time += diff;
    }

    return timestamps;
  }

  *generator<TGeneratedFields extends Fields = TFields>(
    map: (
      timestamp: number,
      index: number
    ) => Serializable<TGeneratedFields> | Array<Serializable<TGeneratedFields>>
  ): SynthtraceGenerator<TGeneratedFields> {
    const timestamps = this.getTimestamps();

    let index = 0;

    for (const timestamp of timestamps) {
      const events = castArray(map(timestamp, index));
      index++;
      for (const event of events) {
        yield event;
      }
    }
  }

  rate(rate: number): Interval {
    return new Interval({ ...this.options, rate });
  }
}
