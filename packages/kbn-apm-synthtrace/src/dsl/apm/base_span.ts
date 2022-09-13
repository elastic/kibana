/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Span } from './span';
import { Transaction } from './transaction';
import { generateLongId } from '../../lib/utils/generate_id';
import { ApmFields } from './apm_fields';
import { Signal } from '../signal';
import { BaseApmSignal } from './base_apm_signal';

export class BaseSpan extends BaseApmSignal<ApmFields> {
  private readonly _children: BaseSpan[] = [];

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

  getChildren() {
    return this._children;
  }

  children(...children: BaseSpan[]): this {
    children.forEach((child) => {
      child.parent(this);
    });

    this._children.push(...children);

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

  yieldSignals(): Array<Signal<ApmFields>> {
    return [this, ...this._children.flatMap((child) => child.yieldSignals())];
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
}
