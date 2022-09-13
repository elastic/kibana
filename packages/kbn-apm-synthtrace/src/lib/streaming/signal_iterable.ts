/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields } from '../../dsl/apm/apm_fields';
import { MergedSignalsStream } from './merged_signals_stream';
import { Fields } from '../../dsl/fields';
import { Signal } from '../../dsl/signal';

export interface SignalIterable<TFields extends Fields>
  extends Iterable<Signal<TFields>>,
    AsyncIterable<Signal<TFields>> {
  order(): 'desc' | 'asc';

  estimatedRatePerMinute(): number;

  toArray(): ApmFields[];

  merge(...iterables: Array<SignalIterable<TFields>>): MergedSignalsStream<TFields>;
}

export class SignalArrayIterable<TFields extends Fields> implements SignalIterable<TFields> {
  constructor(private fields: TFields[]) {
    const timestamps = fields.filter((f) => f['@timestamp']).map((f) => f['@timestamp']!);
    this._order = timestamps.length > 1 ? (timestamps[0] > timestamps[1] ? 'desc' : 'asc') : 'asc';
    const sorted = timestamps.sort();
    const [first, last] = [sorted[0], sorted.slice(-1)[0]];
    const numberOfMinutes = Math.ceil(Math.abs(last - first) / (1000 * 60)) % 60;
    this._ratePerMinute = sorted.length / numberOfMinutes;
  }

  private readonly _order: 'desc' | 'asc';
  order() {
    return this._order;
  }

  private readonly _ratePerMinute: number;
  estimatedRatePerMinute() {
    return this._ratePerMinute;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<Signal<TFields>> {
    return this[Symbol.iterator]();
  }

  [Symbol.iterator](): Iterator<Signal<TFields>> {
    return this[Symbol.iterator]();
  }

  merge(...iterables: Array<SignalIterable<TFields>>): MergedSignalsStream<TFields> {
    return new MergedSignalsStream<TFields>([this, ...iterables]);
  }

  toArray(): TFields[] {
    return this.fields;
  }
}
