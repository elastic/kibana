/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
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
}

export class OtelTransaction extends Serializable<OtelTransactionDocument> {
  constructor(fields: OtelTransactionDocument) {
    super({
      ...fields,
    });
  }
}
