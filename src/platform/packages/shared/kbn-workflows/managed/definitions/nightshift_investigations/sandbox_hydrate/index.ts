/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import SANDBOX_HYDRATE_WORKFLOW_YAML from './sandbox_hydrate_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const NIGHTSHIFT_SANDBOX_HYDRATE_WORKFLOW_ID = 'system-nightshift-sandbox-hydrate';

/**
 * Pre-execution workflow that allocates the investigator sandbox once, then
 * writes Cortex and Semantic Memory pages into that workspace in parallel.
 *
 * Agent Builder's beforeAgent hook still runs `workflow_ids` in sequence so
 * `new_prompt` can chain. Hydrate must not be two entries in that list — each
 * execution would allocate a sandbox. Obtain returns one `sandbox_id`; both
 * writers take it as input so they cannot re-scope or re-allocate.
 *
 * `enablement: 'enforced'` — a disabled workflow makes the beforeAgent hook
 * throw, which aborts the investigation.
 */
export const NIGHTSHIFT_SANDBOX_HYDRATE_WORKFLOW = {
  id: NIGHTSHIFT_SANDBOX_HYDRATE_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 3,
  billable: false,
  yaml: SANDBOX_HYDRATE_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
