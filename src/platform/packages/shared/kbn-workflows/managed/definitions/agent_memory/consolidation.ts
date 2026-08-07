/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import AGENT_MEMORY_CONSOLIDATION_YAML from './consolidation.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const AGENT_MEMORY_CONSOLIDATION_WORKFLOW_ID = 'system-agent-memory-consolidation';

export const AGENT_MEMORY_CONSOLIDATION_WORKFLOW = {
  id: AGENT_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  pluginId: 'agentMemory',
  version: 1,
  billable: false,
  yaml: AGENT_MEMORY_CONSOLIDATION_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition;
