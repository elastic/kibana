/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ACTION_ADD_RULE_EXCEPTION_YAML from './action_add_rule_exception.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';
import {
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
} from '../constants';

export const ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW_ID =
  'system-alertzero-action-add-rule-exception';

export const ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW = {
  billable: false,
  id: ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: ACTION_ADD_RULE_EXCEPTION_YAML,
} as const satisfies ManagedWorkflowDefinition;
