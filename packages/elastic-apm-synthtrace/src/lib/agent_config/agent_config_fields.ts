/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../entity';

export interface Observer {
  hostname: string;
  id: string;
  ephemeral_id: string;
  type: string;
  version: string;
}

export type AgentConfigFields = Fields &
  Partial<{
    'processor.event': string;
    'processor.name': string;
    'labels.etag': string;
    'metricset.name': string;
    observer: Observer;
    agent_config_applied: number;
    'ecs.version': string;
    'event.agent_id_status': string;
    'event.ingested': string;
  }>;
