/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Interval } from './interval';
import { ApmFields } from './apm/apm_fields';
import { SpanGeneratorsUnion } from './span_generators_union';
import { SpanIterable } from './span_iterable';

export class SpanGenerator implements SpanIterable {
  constructor(
    private readonly interval: Interval,
    private readonly dataGenerator: Array<(interval: Interval) => Generator<ApmFields>>
  ) {
    this._order = interval.from > interval.to ? 'desc' : 'asc';
  }

  private readonly _order: 'desc' | 'asc';
  order() {
    return this._order;
  }

  toArray(): ApmFields[] {
    return Array.from(this);
  }

  concat(...iterables: SpanGenerator[]) {
    return new SpanGeneratorsUnion([this, ...iterables]);
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
