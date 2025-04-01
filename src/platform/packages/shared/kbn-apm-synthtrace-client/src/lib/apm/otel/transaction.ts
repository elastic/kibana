/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateShortId } from '../../utils/generate_id';
import { ApmOtelError } from './apm_otel_error';
import { ApmOtelFields } from './apm_otel_fields';
import { OtelBaseSpan } from './otel_base_span';

export class Transaction extends OtelBaseSpan {
  private _sampled: boolean = true;
  private readonly _errors: ApmOtelError[] = [];
  constructor(fields: ApmOtelFields) {
    const spanId = generateShortId();
    super({
      ...fields,
      'attributes.transaction.sampled': true,
      'attributes.transaction.id': spanId,
      'attributes.processor.event': 'transaction',
      'attributes.http.response.status_code': 200,
      'attributes.http.request.method': 'GET',
      'attributes.url.full': 'elastic.co',
      name: fields['attributes.transaction.name'],
      // In Otel we have only spans (https://opentelemetry.io/docs/concepts/signals/traces/#spans)
      span_id: spanId,
      kind: 'Server',
    });
  }

  parent(span: OtelBaseSpan) {
    super.parent(span);

    this._errors.forEach((error) => {
      error.fields.trace_id = this.fields.trace_id;
      error.fields['attributes.transaction.id'] = this.fields['attributes.transaction.id'];
      error.fields['attributes.transaction.name'] = this.fields['attributes.transaction.name'];
      error.fields['attributes.transaction.type'] = this.fields['attributes.transaction.type'];
      error.fields['attributes.transaction.sampled'] =
        this.fields['attributes.transaction.sampled'];
    });

    return this;
  }

  errors(...errors: ApmOtelError[]) {
    errors.forEach((error) => {
      error.fields.trace_id = this.fields.trace_id;
      error.fields['attributes.transaction.id'] = this.fields['attributes.transaction.id'];
      error.fields['attributes.transaction.name'] = this.fields['attributes.transaction.name'];
      error.fields['attributes.transaction.type'] = this.fields['attributes.transaction.type'];
      error.fields['attributes.transaction.sampled'] =
        this.fields['attributes.transaction.sampled'];
    });

    this._errors.push(...errors);

    return this;
  }

  duration(duration: number) {
    this.fields['attributes.transaction.duration.us'] = duration * 1000;
    this.fields.duration = duration * 1000;
    return this;
  }

  serialize() {
    const [transaction, ...spans] = super.serialize();

    const errors = this._errors.flatMap((error) => error.serialize());

    const events = [transaction];
    if (this._sampled) {
      events.push(...spans);
    }

    return events.concat(errors);
  }
}
