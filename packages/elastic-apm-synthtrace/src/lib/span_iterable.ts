/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields } from './apm/apm_fields';
import { Interval } from './interval';

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

  static empty: ConcatenatedSpanGenerators = new ConcatenatedSpanGenerators([]);

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
