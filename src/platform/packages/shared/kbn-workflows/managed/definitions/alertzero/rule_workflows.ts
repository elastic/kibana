/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
} from './constants';
import type { ManagedWorkflowDefinition } from '../../types';
import { readManagedWorkflowYaml } from '../read_managed_workflow_yaml';

export const ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID = 'system-security-coverage-review';
export const ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID = 'system-security-coverage-worker';
export const ALERTZERO_RULE_PREVIEW_WORKFLOW_ID = 'system-security-rule-preview';
export const ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID = 'system-security-rule-tuning-worker';
export const ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID = 'system-security-rule-tuning-review';
export const ALERTZERO_RULE_CREATION_WORKFLOW_ID = 'system-security-rule-creation';

export const ALERTZERO_COVERAGE_REVIEW_WORKFLOW = {
  billable: true,
  id: ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 8,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'coverage_review.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const ALERTZERO_COVERAGE_WORKER_WORKFLOW = {
  billable: true,
  id: ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 6,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'coverage_worker.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const ALERTZERO_RULE_PREVIEW_WORKFLOW = {
  billable: true,
  id: ALERTZERO_RULE_PREVIEW_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 4,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'rule_preview.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

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

export const ALERTZERO_RULE_CREATION_WORKFLOW = {
  billable: true,
  id: ALERTZERO_RULE_CREATION_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 7,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'rule_creation.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;
