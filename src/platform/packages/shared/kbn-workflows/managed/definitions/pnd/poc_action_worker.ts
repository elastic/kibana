/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PND_MANAGED_WORKFLOW_PLUGIN_ID, PND_RULE_WORKFLOW_MANAGEMENT } from './constants';
import POC_ACTION_WORKER_YAML from './poc_action_worker.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERT_ZERO_POC_ACTION_WORKER_WORKFLOW_ID = 'system-alertzero-poc-action-worker';

/** Throwaway proof-of-concept scaffolding: delete rather than rename. */
export const ALERT_ZERO_POC_ACTION_WORKER_WORKFLOW = {
  billable: false,
  id: ALERT_ZERO_POC_ACTION_WORKER_WORKFLOW_ID,
  management: PND_RULE_WORKFLOW_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: POC_ACTION_WORKER_YAML,
} as const satisfies ManagedWorkflowDefinition;
