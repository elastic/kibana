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
import FLOOR_ALERT_TRIAGE_BATCH_YAML from './floor_alert_triage_batch.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID =
  'system-security-floor-alert-triage-batch';

/**
 * One rule's batch of alerts for the Alert Triage sweep, installed once globally and started per
 * batch by the per-space sweep. Its concurrency (`max` running, `queue-size` queued) is the
 * triage parallelism of a space and is pinned to the planner's in-flight ceiling by a test.
 */
export const ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW = {
  billable: false,
  id: ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: FLOOR_ALERT_TRIAGE_BATCH_YAML,
} as const satisfies ManagedWorkflowDefinition;
