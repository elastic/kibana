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
export type Schema = 'ecs' | 'semconv';

export type EntityFields = Fields &
  Partial<{
    'agent.name': string[];
    'source_data_stream.type': string | string[];
    'source_data_stream.dataset': string | string[];
    'event.ingested': string;
    source_index: string;
    'entity.last_seen_timestamp': string;
    'entity.schema_version': string;
    'entity.definition_version': string;
    'entity.display_name': string;
    'entity.identity_fields': string | string[];
    'entity.id': string;
    'entity.type': string;
    'entity.definition_id': string;
    [key: string]: any;
  }>;

export const entities = { serviceEntity, hostEntity, containerEntity };
