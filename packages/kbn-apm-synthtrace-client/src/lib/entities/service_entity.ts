/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EntityDataStreamType, EntityFields } from '.';
import { Serializable } from '../serializable';

class ServiceEntity extends Serializable<EntityFields> {
  constructor(fields: EntityFields) {
    super({
      ...fields,
      'entity.type': 'service',
      'entity.definition_id': 'builtin_services_from_ecs_data',
      'entity.identity_fields': ['service.name'],
    });
  }
}

export function serviceEntity({
  agentName,
  dataStreamType,
  serviceName,
  environment,
  entityId,
}: {
  agentName: string[];
  serviceName: string;
  dataStreamType: EntityDataStreamType[];
  environment?: string;
  entityId: string;
}) {
  return new ServiceEntity({
    'service.name': serviceName,
    'entity.display_name': serviceName,
    'service.environment': environment,
    'source_data_stream.type': dataStreamType,
    'agent.name': agentName,
    'entity.id': entityId,
  });
}
