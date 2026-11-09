/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import DEMO_ACTION_CLOSE_ALERTS_YAML from './demo_action_close_alerts.yaml';
import DEMO_INVESTIGATION_YAML from './demo_investigation.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';
import {
  ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
} from '../constants';

export const ALERTZERO_DEMO_INVESTIGATION_WORKFLOW_ID = 'system-alertzero-demo-investigation';
export const ALERTZERO_DEMO_ACTION_CLOSE_ALERTS_WORKFLOW_ID =
  'system-alertzero-demo-action-close-alerts';

/**
 * POC (Phase 5): a deterministic investigation that needs no model, and the action its proposal
 * runs. No Watch selector, so neither shows in the Watch list. AlertZero installs them only when
 * "Open a case" is on (`xpack.agenticInvestigations.cases.enabled`).
 */
export const ALERTZERO_DEMO_INVESTIGATION_WORKFLOW = {
  billable: false,
  id: ALERTZERO_DEMO_INVESTIGATION_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 4,
  yaml: DEMO_INVESTIGATION_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const ALERTZERO_DEMO_ACTION_CLOSE_ALERTS_WORKFLOW = {
  billable: false,
  id: ALERTZERO_DEMO_ACTION_CLOSE_ALERTS_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: DEMO_ACTION_CLOSE_ALERTS_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const ALERTZERO_DEMO_WORKFLOW_IDS = [
  ALERTZERO_DEMO_INVESTIGATION_WORKFLOW_ID,
  ALERTZERO_DEMO_ACTION_CLOSE_ALERTS_WORKFLOW_ID,
] as const;
