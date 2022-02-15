/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SpanIterable } from './span_iterable';
import { merge } from './utils/merge_iterable';

export class SpanGeneratorsUnion<TFields> implements SpanIterable<TFields> {
  constructor(private readonly dataGenerators: Array<SpanIterable<TFields>>) {
    const orders = new Set<'desc' | 'asc'>(dataGenerators.map((d) => d.order()));
    if (orders.size > 1) throw Error('Can only combine intervals with the same order()');
    this._order = orders.has('asc') ? 'asc' : 'desc';

    this._ratePerMinute = dataGenerators.map((d) => d.ratePerMinute()).reduce((a, b) => a + b, 0);
  }

  private readonly _order: 'desc' | 'asc';
  order() {
    return this._order;
  }

  private readonly _ratePerMinute: number;
  ratePerMinute() {
    return this._ratePerMinute;
  }

  toArray(): TFields[] {
    return Array.from(this);
  }

  concat(...iterables: Array<SpanIterable<TFields>>): SpanGeneratorsUnion<TFields> {
    return new SpanGeneratorsUnion([...this.dataGenerators, ...iterables]);
  }

  *[Symbol.iterator](): Iterator<TFields> {
    const iterator = merge(this.dataGenerators);
    for (const fields of iterator) {
      yield fields;
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterator<TFields> {
    const iterator = merge(this.dataGenerators);
    for await (const fields of iterator) {
      yield fields;
    }
  }
}
