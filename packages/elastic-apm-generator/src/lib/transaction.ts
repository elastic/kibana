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
  constructor(fields: Fields) {
    super({
      ...fields,
      'processor.event': 'transaction',
      'transaction.id': generateEventId(),
      'transaction.sampled': true,
    });
  }
  children(...children: BaseSpan[]) {
    super.children(...children);
    children.forEach((child) =>
      child.defaults({
        'transaction.id': this.fields['transaction.id'],
        'parent.id': this.fields['transaction.id'],
      })
    );
    return this;
  }

  duration(duration: number) {
    this.fields['transaction.duration.us'] = duration * 1000;
    return this;
  }
}
