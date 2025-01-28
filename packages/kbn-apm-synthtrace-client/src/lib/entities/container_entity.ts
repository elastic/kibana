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

class ContainerEntity extends Serializable<EntityFields> {
  constructor(fields: EntityFields) {
    super({
      ...fields,
      'entity.type': 'container',
      'entity.definition_id': 'builtin_containers_from_ecs_data',
      'entity.identity_fields': ['container.id'],
    });
  }
}

export function containerEntity({
  agentName,
  dataStreamType,
  containerId,
  entityId,
}: {
  agentName: string[];
  dataStreamType: EntityDataStreamType[];
  containerId: string;
  entityId: string;
}) {
  return new ContainerEntity({
    'source_data_stream.type': dataStreamType,
    'agent.name': agentName,
    'container.id': containerId,
    'entity.display_name': containerId,
    'entity.id': entityId,
  });
}
