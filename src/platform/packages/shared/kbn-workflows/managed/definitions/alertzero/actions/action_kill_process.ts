/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ACTION_KILL_PROCESS_YAML from './action_kill_process.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';
import {
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
} from '../constants';

export const ALERT_ZERO_ACTION_KILL_PROCESS_WORKFLOW_ID = 'system-alertzero-action-kill-process';

export const ALERT_ZERO_ACTION_KILL_PROCESS_WORKFLOW = {
  billable: false,
  id: ALERT_ZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: ACTION_KILL_PROCESS_YAML,
} as const satisfies ManagedWorkflowDefinition;
