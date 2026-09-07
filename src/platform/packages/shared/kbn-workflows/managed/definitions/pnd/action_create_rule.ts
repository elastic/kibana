/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ACTION_CREATE_RULE_YAML from './action_create_rule.yaml';
import { PND_MANAGED_WORKFLOW_PLUGIN_ID, PND_RULE_WORKFLOW_MANAGEMENT } from './constants';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERT_ZERO_ACTION_CREATE_RULE_WORKFLOW_ID = 'system-alertzero-action-create-rule';

export const ALERT_ZERO_ACTION_CREATE_RULE_WORKFLOW = {
  billable: false,
  id: ALERT_ZERO_ACTION_CREATE_RULE_WORKFLOW_ID,
  management: PND_RULE_WORKFLOW_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: ACTION_CREATE_RULE_YAML,
} as const satisfies ManagedWorkflowDefinition;
