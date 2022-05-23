/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields } from '../apm/apm_fields';

export type AgentConfigFields = Pick<
  ApmFields,
  | '@timestamp'
  | 'processor.event'
  | 'processor.name'
  | 'metricset.name'
  | 'observer'
  | 'ecs.version'
  | 'event.ingested'
> &
  Partial<{
    'labels.etag': string;
    agent_config_applied: number;
    'event.agent_id_status': string;
  }>;
