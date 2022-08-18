/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BaseSpan } from './base_span';
import { generateShortId } from '../utils/generate_id';
import { ApmFields } from './apm_fields';

export class Span extends BaseSpan {
  constructor(fields: ApmFields) {
    super({
      ...fields,
      'processor.event': 'span',
      'span.id': generateShortId(),
    });
  }

  duration(duration: number) {
    this.fields['span.duration.us'] = duration * 1000;
    return this;
  }

  destination(resource: string, type?: string, name?: string) {
    if (!type) {
      type = this.fields['span.type'];
    }

    if (!name) {
      name = resource;
    }
    this.fields['span.destination.service.resource'] = resource;
    this.fields['span.destination.service.name'] = name;
    this.fields['span.destination.service.type'] = type;

    return this;
  }
}
