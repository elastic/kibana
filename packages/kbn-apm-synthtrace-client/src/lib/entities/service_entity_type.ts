/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EntityDataStreamType } from '.';
import { Serializable } from '../serializable';
import { EntityFields } from './entity_fields';

interface ServiceMetrics {
  latency?: number;
  logErrorRate?: number;
  logRate?: number;
  throughput?: number;
  failedTransactionRate?: number;
}

class ServiceEntity extends Serializable<EntityFields> {
  constructor(fields: EntityFields) {
    super({
      ...fields,
      'entity.type': 'service',
      'entity.definitionId': 'history',
    });
  }

  metrics(metrics: ServiceMetrics) {
    this.fields['entity.metrics'] = metrics as Record<string, number>;
    return this;
  }
}

export function serviceEntity({
  agentName,
  dataStreamType,
  serviceName,
  environment,
  entityId,
}: {
  serviceName: string;
  agentName: string;
  dataStreamType: EntityDataStreamType[];
  entityId: string;
  environment?: string;
}) {
  return new ServiceEntity({
    'service.name': serviceName,
    'service.environment': environment,
    'data_stream.type': dataStreamType,
    'agent.name': [agentName],
    'entity.id': entityId,
  });
}
