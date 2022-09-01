/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Interval } from './interval';
import { EntityStreams } from './entity_streams';
import { EntityIterable } from './entity_iterable';
import { Serializable } from './serializable';

export class EntityGenerator<TField> implements EntityIterable<TField> {
  private readonly _gen: () => Generator<Serializable<TField>>;
  constructor(
    private readonly interval: Interval,
    dataGenerator: (interval: Interval) => Generator<Serializable<TField>>
  ) {
    this._order = interval.from > interval.to ? 'desc' : 'asc';

    const generator = dataGenerator(this.interval);
    const peek = generator.next();
    const value = peek.value;

    let callCount = 0;
    this._gen = function* () {
      if (callCount === 0) {
        callCount++;
        yield value;
        yield* generator;
      } else {
        yield* dataGenerator(this.interval);
      }
    };

    const peekedNumberOfEvents = peek.done ? 0 : peek.value.serialize().length;
    this._ratePerMinute = interval.ratePerMinute() * peekedNumberOfEvents;
  }

  private readonly _order: 'desc' | 'asc';
  order() {
    return this._order;
  }

  toArray(): TField[] {
    return Array.from(this);
  }

  merge(...iterables: Array<EntityIterable<TField>>): EntityStreams<TField> {
    return new EntityStreams([this, ...iterables]);
  }

  private readonly _ratePerMinute: number;
  ratePerMinute() {
    return this._ratePerMinute;
  }

  *[Symbol.iterator]() {
    for (const span of this._gen()) {
      for (const fields of span.serialize()) {
        yield fields;
      }
    }
  }

  async *[Symbol.asyncIterator]() {
    for (const span of this._gen()) {
      for (const fields of span.serialize()) {
        yield fields;
      }
    }
  }
}
