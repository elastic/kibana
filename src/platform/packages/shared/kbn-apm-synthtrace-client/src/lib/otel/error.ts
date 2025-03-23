/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OtelDocument } from '../../..';
import { Serializable } from '../serializable';

export interface OtelErrorDocument extends OtelDocument {
  'event.name'?: string;
  attributes?: {
    'exception.message'?: string;
    'error.stack_trace'?: string;
    'exception.handled'?: boolean;
    'exception.type'?: string;
    'processor.event'?: string;
    'timestamp.us'?: number;
    'event.name'?: string;
    'error.id'?: string;
    'error.grouping_key'?: string;
  };
}

export class OtelError extends Serializable<OtelErrorDocument> {
  constructor(fields: OtelErrorDocument) {
    super({
      ...fields,
    });
  }
}
