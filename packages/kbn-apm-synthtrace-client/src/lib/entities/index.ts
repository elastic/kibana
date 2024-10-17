/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Fields } from '../entity';
import { serviceEntity } from './service_entity';
import { hostEntity } from './host_entity';
import { containerEntity } from './container_entity';

export type EntityDataStreamType = 'metrics' | 'logs' | 'traces';

export type EntityFields = Fields &
  Partial<{
    'agent.name': string[];
    'source_data_stream.type': string | string[];
    'source_data_stream.dataset': string | string[];
    'event.ingested': string;
    sourceIndex: string;
    'entity.lastSeenTimestamp': string;
    'entity.schemaVersion': string;
    'entity.definitionVersion': string;
    'entity.displayName': string;
    'entity.identityFields': string | string[];
    'entity.id': string;
    'entity.type': string;
    'entity.definitionId': string;
    [key: string]: any;
  }>;

export const entities = { serviceEntity, hostEntity, containerEntity };
