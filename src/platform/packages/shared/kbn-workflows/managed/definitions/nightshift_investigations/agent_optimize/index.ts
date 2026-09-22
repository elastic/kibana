/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import AGENT_OPTIMIZE_WORKFLOW_YAML from './agent_optimize_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID = 'system-nightshift-agent-optimize';

/**
 * Post-round workflow that updates Cortex and Semantic Memory in parallel.
 *
 * Agent Builder's afterExecution hook still runs `post_execution_workflow_ids`
 * in sequence. Optimize must not be two entries in that list. Obtain returns
 * one `sandbox_id` (the same `<space>__<conversation>` hydrate and the bash
 * tools derive); both writers take it as input.
 *
 * `mode: settled` — one optimizer failing must not skip the other (the old
 * per-workflow `on-failure: continue`).
 *
 * `enablement: 'enforced'` — post-round workflows log failures rather than
 * aborting the agent, but enablement must stay on so every investigation
 * writes durable knowledge back.
 */
export const NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW = {
  id: NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 1,
  billable: false,
  yaml: AGENT_OPTIMIZE_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
