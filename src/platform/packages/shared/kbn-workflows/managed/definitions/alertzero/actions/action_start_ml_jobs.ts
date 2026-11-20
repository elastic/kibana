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

export const ALERTZERO_ACTION_START_ML_JOBS_WORKFLOW_ID = 'system-alertzero-action-start-ml-jobs';

export const ALERTZERO_ACTION_START_ML_JOBS_WORKFLOW = {
  billable: false,
  id: ALERTZERO_ACTION_START_ML_JOBS_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 2,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'action_start_ml_jobs.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;
