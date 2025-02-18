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

export interface OtelMetricDocument extends OtelDocument {
  attributes?: {
    'metricset.name'?: string;
    'processor.event'?: string;
    'event.outcome'?: string;
    'service.target.name'?: string;
    'service.target.type'?: string;
    'span.name'?: string;
    'span.destination.service.resource'?: string;
  };
  metrics?: {
    service_summary?: number;
  };
}
export class OtelMetric extends Serializable<OtelMetricDocument> {
  constructor(fields: OtelMetricDocument) {
    super({
      ...fields,
    });
  }
}
