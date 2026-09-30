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
import FLOOR_ALERT_TRIAGE_REVIEW_YAML from './floor_alert_triage_review.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID =
  'system-security-floor-alert-triage-review';

/**
 * The closure proposal of one Alert Triage batch and the handling of its outcome, installed once
 * globally and started per batch by the per-space Alert Triage Worker. At most 5 wait for a
 * decision per rule.
 */
export const ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW = {
  billable: false,
  id: ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: FLOOR_ALERT_TRIAGE_REVIEW_YAML,
} as const satisfies ManagedWorkflowDefinition;
