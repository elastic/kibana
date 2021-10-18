/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from './entity';
import { Serializable } from './serializable';
import { Span } from './span';
import { Transaction } from './transaction';
import { generateLongId } from './utils/generate_id';

export class BaseSpan extends Serializable {
  private readonly _children: BaseSpan[] = [];

  constructor(fields: Fields) {
    super({
      ...fields,
      'event.outcome': 'unknown',
      'trace.id': generateLongId(),
      'processor.name': 'transaction',
    });
  }

  parent(span: BaseSpan) {
    this.fields['trace.id'] = span.fields['trace.id'];
    this.fields['parent.id'] = span.isSpan()
      ? span.fields['span.id']
      : span.fields['transaction.id'];

    if (this.isSpan()) {
      this.fields['transaction.id'] = span.fields['transaction.id'];
    }
    this._children.forEach((child) => {
      child.parent(this);
    });

    return this;
  }

  children(...children: BaseSpan[]) {
    children.forEach((child) => {
      child.parent(this);
    });

    this._children.push(...children);

    return this;
  }

  success() {
    this.fields['event.outcome'] = 'success';
    return this;
  }

  failure() {
    this.fields['event.outcome'] = 'failure';
    return this;
  }

  serialize(): Fields[] {
    return [this.fields, ...this._children.flatMap((child) => child.serialize())];
  }

  isSpan(): this is Span {
    return this.fields['processor.event'] === 'span';
  }

  isTransaction(): this is Transaction {
    return this.fields['processor.event'] === 'transaction';
  }
}
