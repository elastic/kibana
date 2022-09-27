/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SignalIterable } from './signal_iterable';
import { merge } from '../utils/merge_iterable';
import { Signal } from '../../dsl/signal';

export class MergedSignalsStream<TFields> implements SignalIterable<TFields> {
  constructor(private readonly dataGenerators: Array<SignalIterable<TFields>>) {
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

  toArray(): Array<Signal<TFields>> {
    return Array.from(this);
  }

  merge(...iterables: Array<SignalIterable<TFields>>): MergedSignalsStream<TFields> {
    return new MergedSignalsStream([...this.dataGenerators, ...iterables]);
  }

  *[Symbol.iterator](): Iterator<Signal<TFields>> {
    const iterator = merge(this.dataGenerators);
    for (const fields of iterator) {
      yield fields;
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterator<Signal<TFields>> {
    const iterator = merge(this.dataGenerators);
    for await (const fields of iterator) {
      yield fields;
    }
  }
}
