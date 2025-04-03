/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateLongId } from '../../utils/generate_id';
import { AbstractSpan } from '../abstract_span';
import { ApmOtelFields } from './apm_otel_fields';
import { Span } from './span';
import { Transaction } from './transaction';

export class OtelBaseSpan extends AbstractSpan<ApmOtelFields, OtelBaseSpan> {
  constructor(fields: ApmOtelFields) {
    super({
      'attributes.processor.event': 'span',
      'attributes.event.outcome': 'unknown',
      'data_stream.dataset': 'generic.otel',
      'data_stream.namespace': 'default',
      'data_stream.type': 'traces',
      'resource.attributes.os.type': 'Linux',
      ...fields,
      trace_id: generateLongId(),
    });
  }

  parent(span: OtelBaseSpan): this {
    this.fields.trace_id = span.fields.trace_id;
    this.fields.parent_span_id = span.fields.span_id;

    if (this.isSpan()) {
      this.fields['attributes.transaction.id'] = span.fields['attributes.transaction.id'];
    }
    this._children.forEach((child) => {
      child.parent(this);
    });

    return this;
  }

  success(): this {
    this.fields['attributes.event.outcome'] = 'success';
    return this;
  }

  failure(): this {
    this.fields['attributes.event.outcome'] = 'failure';
    return this;
  }

  outcome(outcome: 'success' | 'failure' | 'unknown'): this {
    this.fields['attributes.event.outcome'] = outcome;
    return this;
  }

  isSpan(): this is Span {
    return this.fields['attributes.processor.event'] === 'span';
  }

  isTransaction(): this is Transaction {
    return this.fields['attributes.processor.event'] === 'transaction';
  }

  override timestamp(timestamp: number) {
    const ret = super.timestamp(timestamp);
    this.fields['attributes.timestamp.us'] = timestamp * 1000;
    return ret;
  }
}
