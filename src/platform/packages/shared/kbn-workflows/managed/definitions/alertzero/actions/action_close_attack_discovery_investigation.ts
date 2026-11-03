/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_YAML from './action_close_attack_discovery_investigation.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';
import {
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
} from '../constants';

export const ALERTZERO_ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_WORKFLOW_ID =
  'system-alertzero-action-close-attack-discovery-investigation';

/**
 * Always-gated action that closes an Investigation with the attack it was opened for
 * and that attack's alerts. Proposed by `forensics_close_investigation_gate.yaml`.
 */
export const ALERTZERO_ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_WORKFLOW = {
  billable: false,
  id: ALERTZERO_ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_YAML,
} as const satisfies ManagedWorkflowDefinition;
