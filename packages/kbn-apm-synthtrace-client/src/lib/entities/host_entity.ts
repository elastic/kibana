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

class HostEntity extends Serializable<EntityFields> {
  constructor(fields: EntityFields) {
    super({
      ...fields,
      'entity.type': 'host',
      'entity.definitionId': 'latest',
    });
  }
}

export function hostEntity({
  agentName,
  dataStreamType,
  dataStreamDataset,
  hostName,
  entityId,
}: {
  agentName: string[];
  dataStreamType: EntityDataStreamType[];
  dataStreamDataset: string;
  hostName: string;
  entityId: string;
}) {
  return new HostEntity({
    'source_data_stream.type': dataStreamType,
    'source_data_stream.dataset': dataStreamDataset,
    'agent.name': agentName,
    'host.name': hostName,
    'entity.id': entityId,
  });
}
