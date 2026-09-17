/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import MEMORY_OPTIMIZE_WORKFLOW_YAML from './memory_optimize_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const NIGHTSHIFT_MEMORY_OPTIMIZE_WORKFLOW_ID = 'system-nightshift-semantic-memory-optimize';

/**
 * Post-round workflow that labels recalled memories and extracts durable facts.
 *
 * `enablement: 'enforced'` — post-round workflows log failures rather than
 * aborting the agent, but enablement must stay on so every investigation
 * writes telemetry feedback back.
 */
export const NIGHTSHIFT_MEMORY_OPTIMIZE_WORKFLOW = {
  id: NIGHTSHIFT_MEMORY_OPTIMIZE_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 1,
  billable: false,
  yaml: MEMORY_OPTIMIZE_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
