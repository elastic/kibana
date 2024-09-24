/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OtelDocument } from '../../..';
import { Serializable } from '../serializable';

export interface OtelErrorDocument extends OtelDocument {
  name?: string;
  attributes?: {
    'exception.message'?: string;
    'exception.type'?: string;
    'processor.event'?: string;
    'timestamp.us'?: number;
  };
}

export class OtelError extends Serializable<OtelErrorDocument> {
  constructor(fields: OtelErrorDocument) {
    super({
      ...fields,
    });
  }
}
