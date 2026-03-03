/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Span } from './span';
import type { Transaction } from './transaction';
import { generateLongId } from '../utils/generate_id';
import type { ApmFields } from './apm_fields';
import { AbstractSpan } from './abstract_span';

export class BaseSpan extends AbstractSpan<ApmFields, BaseSpan> {
  constructor(fields: ApmFields) {
    super({
      ...fields,
      'event.outcome': 'unknown',
      'trace.id': generateLongId(),
      'processor.name': 'transaction',
    });
  }

  parent(span: BaseSpan): this {
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

  success(): this {
    this.fields['event.outcome'] = 'success';
    return this;
  }

  failure(): this {
    this.fields['event.outcome'] = 'failure';
    return this;
  }

  outcome(outcome: 'success' | 'failure' | 'unknown'): this {
    this.fields['event.outcome'] = outcome;
    return this;
  }

  crash(): this {
    this.fields['event.name'] = 'crash';
    return this;
  }

  isSpan(): this is Span {
    return this.fields['processor.event'] === 'span';
  }

  isTransaction(): this is Transaction {
    return this.fields['processor.event'] === 'transaction';
  }

  labels(labels: Record<string, string>) {
    Object.entries(labels).forEach(([key, value]) => {
      // @ts-expect-error
      this.fields[`labels.${key}`] = value;
    });
    return this;
  }

  override timestamp(timestamp: number) {
    const ret = super.timestamp(timestamp);
    this.fields['timestamp.us'] = timestamp * 1000;
    return ret;
  }
}
