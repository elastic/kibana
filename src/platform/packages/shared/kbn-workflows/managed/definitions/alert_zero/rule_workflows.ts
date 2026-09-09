/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERT_ZERO_MANAGED_WORKFLOW_PLUGIN_ID, ALERT_ZERO_RULE_WORKFLOW_MANAGEMENT } from './constants';
import RULE_CREATION_YAML from './rule_creation.yaml';
import RULE_PREVIEW_YAML from './rule_preview.yaml';
import RULE_TUNING_YAML from './rule_tuning.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERT_ZERO_RULE_PREVIEW_WORKFLOW_ID = 'system-security-rule-preview';
export const ALERT_ZERO_RULE_TUNING_WORKFLOW_ID = 'system-security-rule-tuning';
export const ALERT_ZERO_RULE_CREATION_WORKFLOW_ID = 'system-security-rule-creation';

export const ALERT_ZERO_RULE_PREVIEW_WORKFLOW = {
  billable: false,
  id: ALERT_ZERO_RULE_PREVIEW_WORKFLOW_ID,
  management: ALERT_ZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERT_ZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: RULE_PREVIEW_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const ALERT_ZERO_RULE_TUNING_WORKFLOW = {
  billable: false,
  id: ALERT_ZERO_RULE_TUNING_WORKFLOW_ID,
  management: ALERT_ZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERT_ZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 2,
  yaml: RULE_TUNING_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const ALERT_ZERO_RULE_CREATION_WORKFLOW = {
  billable: false,
  id: ALERT_ZERO_RULE_CREATION_WORKFLOW_ID,
  management: ALERT_ZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERT_ZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 2,
  yaml: RULE_CREATION_YAML,
} as const satisfies ManagedWorkflowDefinition;
