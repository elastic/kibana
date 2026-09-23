/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import DECISION_TREE_HYDRATE_WORKFLOW_YAML from './decision_tree_hydrate_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID =
  'system-nightshift-decision-tree-hydrate';

/**
 * Pre-execution workflow that writes the stored decision trees into
 * /workspace/decision-trees before every reinforcement round.
 *
 * `enablement: 'enforced'` — a disabled workflow makes the beforeAgent hook
 * throw, which aborts the reinforcement round.
 */
export const NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW = {
  id: NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 1,
  billable: false,
  yaml: DECISION_TREE_HYDRATE_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
