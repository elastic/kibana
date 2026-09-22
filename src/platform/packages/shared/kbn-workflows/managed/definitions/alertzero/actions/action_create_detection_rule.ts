/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ACTION_CREATE_DETECTION_RULE_YAML from './action_create_detection_rule.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';
import {
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
} from '../constants';

export const ALERTZERO_ACTION_CREATE_RULE_WORKFLOW_ID = 'system-alertzero-action-create-rule';

export const ALERTZERO_ACTION_CREATE_RULE_WORKFLOW = {
  billable: false,
  id: ALERTZERO_ACTION_CREATE_RULE_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: ACTION_CREATE_DETECTION_RULE_YAML,
} as const satisfies ManagedWorkflowDefinition;
