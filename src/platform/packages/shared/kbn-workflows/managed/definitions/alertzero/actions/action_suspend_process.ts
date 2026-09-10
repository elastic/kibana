/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ACTION_SUSPEND_PROCESS_YAML from './action_suspend_process.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';
import { PND_MANAGED_WORKFLOW_PLUGIN_ID, PND_RULE_WORKFLOW_MANAGEMENT } from '../constants';

export const ALERT_ZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID =
  'system-alertzero-action-suspend-process';

export const ALERT_ZERO_ACTION_SUSPEND_PROCESS_WORKFLOW = {
  billable: false,
  id: ALERT_ZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
  management: PND_RULE_WORKFLOW_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: ACTION_SUSPEND_PROCESS_YAML,
} as const satisfies ManagedWorkflowDefinition;
