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

// In Otel we have only spans (https://opentelemetry.io/docs/concepts/signals/traces/#spans)
export class OtelSpan extends OtelBaseSpan {
  private readonly _errors: ApmOtelError[] = [];
  private _sampled: boolean = true;
  constructor(fields: ApmOtelFields) {
    super({
      kind: 'Internal',
      ...fields,
      span_id: generateShortId(),
    });
  }

  duration(duration: number) {
    this.fields.duration = duration * 1000;
    return this;
  }

  parent(span: OtelBaseSpan) {
    super.parent(span);

    this._errors.forEach((error) => {
      error.fields.trace_id = this.fields.trace_id;
      error.fields.parent_span_id = this.fields.span_id;
      error.fields.name = this.fields.name;
      error.fields.kind = this.fields.kind;
      error.fields.duration = this.fields.duration;
    });

    return this;
  }

  errors(...errors: ApmOtelError[]) {
    errors.forEach((error) => {
      error.fields.trace_id = this.fields.trace_id;
      error.fields.span_id = this.fields.span_id;
      error.fields.name = this.fields.name;
      error.fields.kind = this.fields.kind;
      error.fields.duration = this.fields.duration;
    });

    this._errors.push(...errors);

    return this;
  }

  destination(resource: string) {
    this.fields['attributes.span.destination.service.resource'] = resource;
    this.fields.kind = 'Client';
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
