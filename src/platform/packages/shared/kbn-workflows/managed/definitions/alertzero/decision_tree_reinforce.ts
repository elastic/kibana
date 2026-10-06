/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
} from './constants';
import DECISION_TREE_REINFORCE_YAML from './decision_tree_reinforce.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_DECISION_TREE_REINFORCE_WORKFLOW_ID =
  'system-security-decision-tree-reinforce';

/**
 * Post-analysis workflow that turns one forensic result into a tentative decision tree.
 * The endpoint-analysis run calls it and continues when it fails.
 */
export const ALERTZERO_DECISION_TREE_REINFORCE_WORKFLOW = {
  billable: false,
  id: ALERTZERO_DECISION_TREE_REINFORCE_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: DECISION_TREE_REINFORCE_YAML,
} as const satisfies ManagedWorkflowDefinition;
