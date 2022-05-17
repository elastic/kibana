/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Entity } from '../entity';
import { AgentConfigFields } from './agent_config_fields';
import { AgentConfigMetrics } from './agent_config_metrics';

export class AgentConfig extends Entity<AgentConfigFields> {
  metrics() {
    return new AgentConfigMetrics({
      ...this.fields,
      agent_config_applied: 1,
    });
  }
}

export function agentConfig(etag: string) {
  return new AgentConfig({
    'labels.etag': etag,
  });
}
