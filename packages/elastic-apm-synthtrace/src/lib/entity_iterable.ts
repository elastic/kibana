/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields } from './apm/apm_fields';
import { EntityStreams } from './entity_streams';
import { Fields } from './entity';

export interface EntityIterable<TFields extends Fields = ApmFields>
  extends Iterable<TFields>,
    AsyncIterable<TFields> {
  order(): 'desc' | 'asc';

  ratePerMinute(): number;

  toArray(): ApmFields[];

  merge(...iterables: Array<EntityIterable<TFields>>): EntityStreams<TFields>;
}

export class EntityArrayIterable<TFields extends Fields = ApmFields>
  implements EntityIterable<TFields>
{
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
  ratePerMinute() {
    return this._ratePerMinute;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<TFields> {
    return this.fields[Symbol.iterator]();
  }

  [Symbol.iterator](): Iterator<TFields> {
    return this.fields[Symbol.iterator]();
  }

  merge(...iterables: Array<EntityIterable<TFields>>): EntityStreams<TFields> {
    return new EntityStreams<TFields>([this, ...iterables]);
  }

  toArray(): TFields[] {
    return this.fields;
  }
}
