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
import FLOOR_ALERT_TRIAGE_ATTACH_NEW_RULES_YAML from './floor_alert_triage_attach_new_rules.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_FLOOR_ALERT_TRIAGE_ATTACH_NEW_RULES_WORKFLOW_ID =
  'system-security-floor-alert-triage-attach-new-rules';

/**
 * Attaches the Alert Triage Worker to rules as they are created, started by the
 * `security.detectionRulesCreated` trigger. Installed once globally, like the closure review, so it
 * fires for rules created in any space and is only installed while AlertZero is.
 */
export const ALERTZERO_FLOOR_ALERT_TRIAGE_ATTACH_NEW_RULES_WORKFLOW = {
  billable: false,
  id: ALERTZERO_FLOOR_ALERT_TRIAGE_ATTACH_NEW_RULES_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: FLOOR_ALERT_TRIAGE_ATTACH_NEW_RULES_YAML,
} as const satisfies ManagedWorkflowDefinition;
