/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields } from './apm/apm_fields';
import { SpanIterable } from './span_iterable';
import { merge } from './utils/merge_iterable';

export class SpanGeneratorsUnion implements SpanIterable {
  constructor(private readonly dataGenerators: SpanIterable[]) {
    const orders = new Set<'desc' | 'asc'>(dataGenerators.map((d) => d.order()));
    if (orders.size > 1) throw Error('Can only combine intervals with the same order()');
    this._order = orders.has('asc') ? 'asc' : 'desc';
  }

  static empty: SpanGeneratorsUnion = new SpanGeneratorsUnion([]);

  private readonly _order: 'desc' | 'asc';
  order() {
    return this._order;
  }

  toArray(): ApmFields[] {
    return Array.from(this);
  }

  concat(...iterables: SpanIterable[]) {
    return new SpanGeneratorsUnion([...this.dataGenerators, ...iterables]);
  }

  *[Symbol.iterator]() {
    const iterator = merge(this.dataGenerators);
    for (const fields of iterator) {
      yield fields;
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
