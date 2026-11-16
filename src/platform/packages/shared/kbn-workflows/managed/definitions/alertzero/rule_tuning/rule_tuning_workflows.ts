/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../../../types';
import { readManagedWorkflowYaml } from '../../read_managed_workflow_yaml';
import {
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
} from '../constants';

export const ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID = 'system-security-rule-tuning-worker';
export const ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID = 'system-security-rule-tuning-review';

export const ALERTZERO_RULE_TUNING_WORKER_WORKFLOW = {
  billable: true,
  id: ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 34,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'rule_tuning_worker.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW = {
  billable: true,
  id: ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 36,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'rule_tuning_review.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;
