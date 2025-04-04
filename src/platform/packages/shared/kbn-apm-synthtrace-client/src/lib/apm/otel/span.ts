/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateShortId } from '../../utils/generate_id';
import { ApmOtelFields } from './apm_otel_fields';
import { OtelBaseSpan } from './otel_base_span';

export class Span extends OtelBaseSpan {
  constructor(fields: ApmOtelFields) {
    super({
      ...fields,
      span_id: generateShortId(),
      name: fields['attributes.span.name'],
      'attributes.processor.event': 'span',
      kind: 'Internal',
    });
  }

  duration(duration: number) {
    this.fields['attributes.span.duration.us'] = duration * 1000;
    this.fields.duration = duration * 1000;
    return this;
  }

  destination(resource: string) {
    this.fields['attributes.span.destination.service.resource'] = resource;
    this.fields.kind = 'Client';
    return this;
  }
}
