/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castArray, sum } from 'lodash';
import moment, { unitOfTime } from 'moment';
import { ToolingLog } from '@kbn/tooling-log';
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
  log: ToolingLog;
}

interface StepDetails {
  stepMilliseconds: number;
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

  private getIntervalMilliseconds(): number {
    return moment.duration(this.intervalAmount, this.intervalUnit).asMilliseconds();
  }

  private getTimestamps() {
    const from = this.options.from.getTime();
    const to = this.options.to.getTime();

    let time: number = from;
    const diff = this.getIntervalMilliseconds();

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
      index: number,
      stepDetails: StepDetails
    ) => Serializable<TGeneratedFields> | Array<Serializable<TGeneratedFields>>
  ): SynthtraceGenerator<TGeneratedFields> {
    const timestamps = this.getTimestamps();
    const stepDetails: StepDetails = {
      stepMilliseconds: this.getIntervalMilliseconds(),
    };

    let index = 0;

    const startTime = performance.now();
    const from = this.options.from.getTime();
    const to = this.options.to.getTime();

    const calculateEvery = 10;

    const reportEveryMs = 5000;

    let lastReport = 0;

    let count = 0;

    const measurements: number[] = [];

    let lastTimestamp = from;
    let lastNow = performance.now();

    const measure = (timestamp: number) => {
      const timeProcessed = timestamp - lastTimestamp;

      lastTimestamp = timestamp;

      const now = performance.now();

      const timeProcessedPerMs = timeProcessed / (now - lastNow);

      lastNow = now;

      measurements.unshift(timeProcessedPerMs);
      measurements.length = Math.min(10, measurements.length);

      if (now - lastReport >= reportEveryMs) {
        report(now);
      }
    };

    const report = (now: number) => {
      const totalProgress = (lastTimestamp - from) / (to - from);

      const timeElapsedInMs = now - startTime;

      const durationFormatted = moment.duration(timeElapsedInMs, 'ms').humanize();

      const avgSpeed = sum(measurements) / measurements.length;

      const timeLeftToProcess = to - lastTimestamp;

      const estimatedTimeOfCompletion = timeLeftToProcess / avgSpeed;

      const etaFormatted = moment.duration(estimatedTimeOfCompletion, 'ms').humanize(true);

      lastReport = now;

      this.options.log.info(
        `progress=${(totalProgress * 100).toPrecision(
          3
        )}%, duration=${durationFormatted}, eta=${etaFormatted}`
      );
    };

    for (const timestamp of timestamps) {
      const events = castArray(map(timestamp, index, stepDetails));
      index++;
      count += events.length;
      if (index % calculateEvery === 0) {
        if (events.length) {
          const last = events.find((event) => event.fields['@timestamp'])?.fields['@timestamp'];
          if (last) {
            measure(last);
          }
        }
      }
      for (const event of events) {
        yield event;
      }
    }
  }

  rate(rate: number): Interval {
    return new Interval({ ...this.options, rate });
  }
}
