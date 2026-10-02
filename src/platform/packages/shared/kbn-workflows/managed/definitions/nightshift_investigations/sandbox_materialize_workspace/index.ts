/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_YAML from './sandbox_materialize_workspace_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID =
  'system-nightshift-sandbox-materialize-workspace';

/**
 * Pre-execution workflow that allocates the investigator sandbox once, then
 * writes Cortex, Semantic Memory, and the decision trees into that workspace in
 * parallel.
 *
 * Agent Builder's beforeAgent hook runs `workflow_ids` on every execution;
 * this workflow allocates and materializes only when round_execution_index is 0.
 * Obtain returns one `sandbox_id` shared by every writer so they cannot re-scope
 * or re-allocate within the round.
 *
 * `mode: settled` — a writer that fails or blows `branch-timeout` does not fail the round.
 * Each writer catches its own error and returns the incomplete-materialization notice for
 * its own directory; `compose_prompt` covers the branch-timeout case, where the branch
 * produced no output to report it with. A parallel branch body must stay a straight line
 * of atomic steps, so the tree branch carries no `if`/`on-failure`/`timeout`; the feature
 * flag is honored inside the step handler instead.
 *
 * `enablement: 'enforced'` — a disabled workflow makes the beforeAgent hook
 * throw, which aborts the investigation.
 */
export const NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW = {
  id: NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 4,
  billable: false,
  yaml: SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
