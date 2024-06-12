/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields } from './apm_fields';
import { Serializable } from '../serializable';
import { generateLongIdWithSeed, generateShortId, generateLongId } from '../utils/generate_id';

export class ApmError extends Serializable<ApmFields> {
  constructor(fields: ApmFields) {
    super({
      ...fields,
      'processor.event': 'error',
      'processor.name': 'error',
      'error.id': generateShortId(),
    });
  }

  serialize() {
    const errorMessage =
      this.fields['error.grouping_name'] || this.fields['error.exception']?.[0]?.message;

    const [data] = super.serialize();
    data['error.grouping_key'] = errorMessage
      ? generateLongIdWithSeed(errorMessage)
      : generateLongId();
    return [data];
  }

  timestamp(value: number) {
    const ret = super.timestamp(value);
    this.fields['timestamp.us'] = value * 1000;
    return ret;
  }
}
