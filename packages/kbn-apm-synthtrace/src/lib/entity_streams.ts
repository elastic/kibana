/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EntityIterable } from './entity_iterable';
import { merge } from './utils/merge_iterable';

// @ts-expect-error
export class EntityStreams<TFields> implements EntityIterable<TFields> {
  // @ts-expect-error
  constructor(private readonly dataGenerators: Array<EntityIterable<TFields>>) {
    const orders = new Set<'desc' | 'asc'>(dataGenerators.map((d) => d.order()));
    if (orders.size > 1) throw Error('Can only combine intervals with the same order()');
    this._order = orders.has('asc') ? 'asc' : 'desc';

    this._ratePerMinute = dataGenerators
      .map((d) => d.estimatedRatePerMinute())
      .reduce((a, b) => a + b, 0);
  }

  private readonly _order: 'desc' | 'asc';
  order() {
    return this._order;
  }

  private readonly _ratePerMinute: number;
  estimatedRatePerMinute() {
    return this._ratePerMinute;
  }

  // @ts-expect-error
  toArray(): TFields[] {
    return Array.from(this);
  }

  // @ts-expect-error
  merge(...iterables: Array<EntityIterable<TFields>>): EntityStreams<TFields> {
    return new EntityStreams([...this.dataGenerators, ...iterables]);
  }

  *[Symbol.iterator](): Iterator<TFields> {
    // @ts-expect-error
    const iterator = merge(this.dataGenerators);
    for (const fields of iterator) {
      // @ts-expect-error
      yield fields;
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterator<TFields> {
    // @ts-expect-error
    const iterator = merge(this.dataGenerators);
    for await (const fields of iterator) {
      // @ts-expect-error
      yield fields;
    }
  }
}
