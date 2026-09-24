/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import DECISION_TREE_REINFORCE_WORKFLOW_YAML from './decision_tree_reinforce_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const NIGHTSHIFT_DECISION_TREE_REINFORCE_WORKFLOW_ID =
  'system-nightshift-decision-tree-reinforce';

/**
 * Post-round workflow that turns a finished investigation round into decision-tree edits.
 *
 * `enablement: 'enforced'` — post-round workflows log failures rather than aborting the agent,
 * but enablement must stay on so every investigation feeds the trees it exercised.
 */
export const NIGHTSHIFT_DECISION_TREE_REINFORCE_WORKFLOW = {
  id: NIGHTSHIFT_DECISION_TREE_REINFORCE_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 1,
  billable: false,
  yaml: DECISION_TREE_REINFORCE_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
