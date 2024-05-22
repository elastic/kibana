/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Entity, EntityDocument } from './entities';

export interface ServiceEntityDocument extends EntityDocument {
  'entity.metric.latency'?: number;
  'entity.metric.throughput'?: number;
  'entity.metric.failedTransactionRate'?: number;
  'entity.metric.logRate'?: number;
  'entity.metric.errorRate'?: number;
}

export class ServiceEntity extends Entity<ServiceEntityDocument> {
  constructor(fields: ServiceEntityDocument) {
    super({ ...fields });
  }
}
