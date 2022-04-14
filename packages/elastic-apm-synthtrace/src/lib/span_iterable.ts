/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields } from './apm/apm_fields';
import { SpanGeneratorsUnion } from './span_generators_union';

export interface SpanIterable extends Iterable<ApmFields>, AsyncIterable<ApmFields> {
  order(): 'desc' | 'asc';

  toArray(): ApmFields[];

  concat(...iterables: SpanIterable[]): SpanGeneratorsUnion;
}

export class SpanArrayIterable implements SpanIterable {
  constructor(private fields: ApmFields[]) {
    const timestamps = fields.filter((f) => f['@timestamp']).map((f) => f['@timestamp']!);
    this._order = timestamps.length > 1 ? (timestamps[0] > timestamps[1] ? 'desc' : 'asc') : 'asc';
  }

  private readonly _order: 'desc' | 'asc';
  order() {
    return this._order;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<ApmFields> {
    return this.fields[Symbol.iterator]();
  }

  [Symbol.iterator](): Iterator<ApmFields> {
    return this.fields[Symbol.iterator]();
  }

  concat(...iterables: SpanIterable[]): SpanGeneratorsUnion {
    return new SpanGeneratorsUnion([this, ...iterables]);
  }

  toArray(): ApmFields[] {
    return this.fields;
  }
}
