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
import FLOOR_ALERT_TRIAGE_EXCLUSION_YAML from './floor_alert_triage_exclusion.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_FLOOR_ALERT_TRIAGE_EXCLUSION_WORKFLOW_ID =
  'system-security-floor-alert-triage-exclusion';

/**
 * Takes an alert out of its open closure proposal when an analyst gives it another verdict on the
 * Alerts page. Installed globally and started by the alert tag change event, not by the sweep.
 */
export const ALERTZERO_FLOOR_ALERT_TRIAGE_EXCLUSION_WORKFLOW = {
  billable: false,
  id: ALERTZERO_FLOOR_ALERT_TRIAGE_EXCLUSION_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: FLOOR_ALERT_TRIAGE_EXCLUSION_YAML,
} as const satisfies ManagedWorkflowDefinition;
