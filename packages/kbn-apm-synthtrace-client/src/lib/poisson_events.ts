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

export class PoissonEvents<TFields extends Fields = Fields> {
  constructor(
    private readonly from: Date,
    private readonly to: Date,
    private readonly rate: number
  ) {}

  private getTotalTimePeriod(): number {
    return this.to.getTime() - this.from.getTime();
  }

  private getInterarrivalTime(): number {
    const distribution = -Math.log(1 - Math.random()) / this.rate;
    const totalTimePeriod = this.getTotalTimePeriod();
    return Math.floor(distribution * totalTimePeriod);
  }

  *generator<TGeneratedFields extends Fields = TFields>(
    map: (
      timestamp: number,
      index: number
    ) => Serializable<TGeneratedFields> | Array<Serializable<TGeneratedFields>>
  ): SynthtraceGenerator<TGeneratedFields> {
    if (this.rate <= 0) {
      return;
    }

    let currentTime = this.from.getTime();
    const endTime = this.to.getTime();
    let eventIndex = 0;

    while (currentTime < endTime) {
      const interarrivalTime = this.getInterarrivalTime();
      currentTime += interarrivalTime;

      if (currentTime < endTime) {
        yield* this.generateEvents(currentTime, eventIndex, map);
        eventIndex++;
      }
    }

    // ensure at least one event has been emitted
    if (this.rate > 0 && eventIndex === 0) {
      const forcedEventTime =
        this.from.getTime() + Math.floor(Math.random() * this.getTotalTimePeriod());
      yield* this.generateEvents(forcedEventTime, eventIndex, map);
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
