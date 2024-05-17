/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Entity } from '../entity';
import { AgentConfig } from './agent_config';
import { AgentConfigFields } from './agent_config_fields';

export class Observer extends Entity<AgentConfigFields> {
  agentConfig() {
    return new AgentConfig();
  }
}

export function observer() {
  return new Observer({});
}
