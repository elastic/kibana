/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EntityDataStreamType } from '.';
import { Serializable } from '../serializable';
import { HistoryEntityDocument } from './history_entity';

interface ServiceEntityDocument extends HistoryEntityDocument {
  'service.environment': string;
  'service.name': string;
  'service.runtime.name': string[];
  'service.runtime.version': string[];
  'service.language.name': string[];
  'service.version': string[];
}

interface ServiceMetrics {
  latency?: number;
  logErrorRate?: number;
  logRate?: number;
  throughput?: number;
  failedTransactionRate?: number;
}

class ServiceEntity extends Serializable<Partial<ServiceEntityDocument>> {
  constructor(fields: Partial<ServiceEntityDocument>) {
    super({ ...fields, 'entity.type': 'service', 'entity.definitionId': 'builtin_services' });
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
}: {
  serviceName: string;
  agentName: string;
  dataStreamType: EntityDataStreamType[];
  environment?: string;
}) {
  return new ServiceEntity({
    'service.name': serviceName,
    'service.environment': environment,
    'data_stream.type': dataStreamType,
    'agent.name': [agentName],
  });
}
