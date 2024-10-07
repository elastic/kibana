/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
<<<<<<< HEAD
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OtelDocument } from '@kbn/apm-synthtrace-client';
import { Serializable } from '../serializable';
// import { generateShortId } from '../utils/generate_id';

export class OtelTransaction extends Serializable<OtelDocument> {
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
=======
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OtelDocument } from '.';
import { Serializable } from '../serializable';

export interface OtelTransactionDocument extends OtelDocument {
  attributes?: {
    'event.outcome'?: string;
    'event.success_count'?: number;
    'processor.event'?: string;
    'timestamp.us'?: number;
    'transaction.duration.us'?: number;
    'transaction.id'?: string;
    'transaction.name'?: string;
    'transaction.representative_count'?: number;
    'transaction.result'?: string;
    'transaction.root'?: boolean;
    'transaction.sampled'?: boolean;
    'transaction.type'?: string;
  };
  status?: {
    code?: string;
  };
  dropped_events_count?: number;
  dropped_links_count?: number;
  duration?: number;
  kind?: string;
  name?: string;
  transaction: { id: string };
}

export class OtelTransaction extends Serializable<OtelTransactionDocument> {
  constructor(fields: OtelTransactionDocument) {
    super({
      ...fields,
    });
  }
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
}
