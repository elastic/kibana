/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castArray } from 'lodash';
import { SynthtraceGenerator } from '../types';
import { Fields } from './entity';
import { Serializable } from './serializable';

export class GaussianEvents<TFields extends Fields = Fields> {
  constructor(
    private readonly from: Date,
    private readonly to: Date,
    private readonly mean: Date,
    private readonly width: number,
    private readonly totalPoints: number
  ) {}

  *generator<TGeneratedFields extends Fields = TFields>(
    map: (
      timestamp: number,
      index: number
    ) => Serializable<TGeneratedFields> | Array<Serializable<TGeneratedFields>>
  ): SynthtraceGenerator<TGeneratedFields> {
    if (this.totalPoints <= 0) {
      return;
    }

    const startTime = this.from.getTime();
    const endTime = this.to.getTime();
    const meanTime = this.mean.getTime();
    const densityInterval = 1 / (this.totalPoints - 1);

    for (let eventIndex = 0; eventIndex < this.totalPoints; eventIndex++) {
      const quantile = eventIndex * densityInterval;

      const standardScore = Math.sqrt(2) * inverseError(2 * quantile - 1);
      const timestamp = Math.round(meanTime + standardScore * this.width);

      if (timestamp >= startTime && timestamp <= endTime) {
        yield* this.generateEvents(timestamp, eventIndex, map);
      }
    }
  }

  private *generateEvents<TGeneratedFields extends Fields = TFields>(
    timestamp: number,
    eventIndex: number,
    map: (
      timestamp: number,
      index: number
    ) => Serializable<TGeneratedFields> | Array<Serializable<TGeneratedFields>>
  ): Generator<Serializable<TGeneratedFields>> {
    const events = castArray(map(timestamp, eventIndex));
    for (const event of events) {
      yield event;
    }
  }
}

function inverseError(x: number): number {
  const a = 0.147;
  const sign = x < 0 ? -1 : 1;

  const part1 = 2 / (Math.PI * a) + Math.log(1 - x * x) / 2;
  const part2 = Math.log(1 - x * x) / a;

  return sign * Math.sqrt(Math.sqrt(part1 * part1 - part2) - part1);
}
