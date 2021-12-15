/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
import { ApmFields } from './apm/apm_fields';
import { getTransactionMetrics } from './apm/utils/get_transaction_metrics';
import { getSpanDestinationMetrics } from './apm/utils/get_span_destination_metrics';
import { getBreakdownMetrics } from './apm/utils/get_breakdown_metrics';

export const defaultProcessors = [
  getTransactionMetrics,
  getSpanDestinationMetrics,
  getBreakdownMetrics,
];
export async function* streamProcess(
  processors: Array<(events: ApmFields[]) => ApmFields[]>,
  ...eventSources: SpanIterable[]
) {
  let localBuffer = [];
  let flushAfter: number | null = null;
  for (const eventSource of eventSources) {
    for (const event of eventSource) {
      localBuffer.push(event);
      if (flushAfter === undefined)
        flushAfter = moment(new Date(event['@timestamp'] as number)).add(1, 'm').valueOf()

      yield event;
      // TODO move away from chunking and feed this data one by one to processors
      if (
        (flushAfter !== null && Date.now().valueOf() >= flushAfter) ||
        localBuffer.length === 10000
      ) {
        for (const processor of processors) {
          yield* processor(localBuffer);
        }
        localBuffer = [];
        flushAfter = null;
      }
    }
  }
  if (localBuffer.length > 0) {
    for (const processor of processors) {
      yield* processor(localBuffer);
    }
  }
}
export interface SpanIterable extends Iterable<ApmFields>, AsyncIterable<ApmFields> {
  toArray(): ApmFields[];
  concat(...iterables: SpanIterable[]): ConcatenatedSpanGenerators;
}
export class SpanGenerator implements SpanIterable {
  constructor(
    private readonly interval: Interval,
    private readonly dataGenerator: Array<(interval: Interval) => Generator<ApmFields>>
  ) {}

  toArray(): ApmFields[] {
    return Array.from(this);
  }
  concat(...iterables: SpanGenerator[]) {
    return new ConcatenatedSpanGenerators([this, ...iterables]);
  }
  *[Symbol.iterator]() {
    for (const iterator of this.dataGenerator) {
      for (const fields of iterator(this.interval)) {
        yield fields;
      }
    }
  }
  async *[Symbol.asyncIterator]() {
    for (const iterator of this.dataGenerator) {
      for (const fields of iterator(this.interval)) {
        yield fields;
      }
    }
  }
}
export class ConcatenatedSpanGenerators implements SpanIterable {
  constructor(private readonly dataGenerators: SpanIterable[]) {}

  toArray(): ApmFields[] {
    return Array.from(this);
  }
  concat(...iterables: SpanIterable[]) {
    return new ConcatenatedSpanGenerators([...this.dataGenerators, ...iterables]);
  }
  *[Symbol.iterator]() {
    for (const iterator of this.dataGenerators) {
      for (const fields of iterator) {
        yield fields;
      }
    }
  }
  async *[Symbol.asyncIterator]() {
    for (const iterator of this.dataGenerators) {
      for (const fields of iterator) {
        yield fields;
      }
    }
  }
}

export class Interval implements Iterable<number> {
  constructor(
    private readonly from: Date,
    private readonly to: Date,
    private readonly interval: string,
    private readonly yieldRate: number = 1
  ) {}

  transactions(map: (timestamp: number) => ApmFields[]) {
    return this.flatMap(map);
  }
  flatMap(map: (timestamp: number, index?: number) => ApmFields[]): SpanIterable {
    return new SpanGenerator(this, [
      function* (i) {
        let index = 0;
        for (const x of i) {
          for (const a of map(x, index)) {
            yield a;
            index++;
          }
        }
      },
    ]);
  }

  rate(rate: number): Interval {
    return new Interval(this.from, this.to, this.interval, rate);
  }

  private *_generate(): Iterable<number> {
    let now = this.from;
    const args = this.interval.match(/(\d+)(s|m|h|d)/);
    if (!args) {
      throw new Error('Failed to parse interval');
    }
    const yieldRate = () => {
      const timestamp = now.getTime();
      return new Array<number>(this.yieldRate).fill(timestamp);
    };
    do {
      yield* yieldRate();
      now = new Date(
        moment(now)
          .add(Number(args[1]), args[2] as any)
          .valueOf()
      );
    } while (now < this.to);
  }

  [Symbol.iterator]() {
    return this._generate()[Symbol.iterator]();
  }
}
