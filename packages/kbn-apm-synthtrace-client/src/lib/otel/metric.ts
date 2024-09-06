/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OtelDocument } from '@kbn/apm-synthtrace-client';
import { Serializable } from '../serializable';
// import { generateShortId } from '../utils/generate_id';

export class OtelMetric extends Serializable<OtelDocument> {
  constructor(fields: OtelDocument) {
    super({
      ...fields,
      //   'processor.event': 'error',
      //   'processor.name': 'error',
    //   trace_id: generateShortId(),
    });
  }

  timestamp(value: number) {
    const ret = super.timestamp(value);
    this.fields['timestamp.us'] = value * 1000;
    return ret;
  }
}
