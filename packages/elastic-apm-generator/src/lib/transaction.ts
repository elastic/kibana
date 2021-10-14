/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BaseSpan } from './base_span';
import { Fields } from './entity';
import { generateEventId } from './utils/generate_id';

export class Transaction extends BaseSpan {
  private _sampled: boolean = true;

  constructor(fields: Fields) {
    super({
      ...fields,
      'processor.event': 'transaction',
      'transaction.id': generateEventId(),
      'transaction.sampled': true,
    });
  }

  duration(duration: number) {
    this.fields['transaction.duration.us'] = duration * 1000;
    return this;
  }

  sample(sampled: boolean = true) {
    this._sampled = sampled;
    return this;
  }

  serialize() {
    const [transaction, ...spans] = super.serialize();

    const events = [transaction];
    if (this._sampled) {
      events.push(...spans);
    }

    return events;
  }
}
