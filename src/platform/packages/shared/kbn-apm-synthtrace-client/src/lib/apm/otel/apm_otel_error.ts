/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Serializable } from '../../serializable';
import { generateLongId, generateLongIdWithSeed, generateShortId } from '../../utils/generate_id';
import type { ApmOtelFields } from './apm_otel_fields';

export class ApmOtelError extends Serializable<ApmOtelFields> {
  constructor(fields: ApmOtelFields) {
    super({
      ...fields,
      'attributes.processor.event': 'error',
      'attributes.error.id': generateShortId(),
    });
  }

  serialize() {
    const errorMessage =
      this.fields['attributes.error.grouping_key'] || this.fields['attributes.exception.message'];

    const [data] = super.serialize();

    data['attributes.error.grouping_key'] =
      this.fields['attributes.error.grouping_key'] ??
      (errorMessage ? generateLongIdWithSeed(errorMessage) : generateLongId());

    return [data];
  }

  timestamp(value: number) {
    const ret = super.timestamp(value);
    this.fields['attributes.timestamp.us'] = value * 1000;
    return ret;
  }
}
