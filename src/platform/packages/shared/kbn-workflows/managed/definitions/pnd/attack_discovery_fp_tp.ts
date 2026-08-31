/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ATTACK_DISCOVERY_FP_TP_YAML from './attack_discovery_fp_tp.yaml';
import { PND_MANAGED_WORKFLOW_PLUGIN_ID, PND_RULE_WORKFLOW_MANAGEMENT } from './constants';
import type { ManagedWorkflowDefinition } from '../../types';

export const PND_ATTACK_DISCOVERY_FP_TP_WORKFLOW_ID =
  'system-security-attack-discovery-fp-tp-analysis';

export const PND_ATTACK_DISCOVERY_FP_TP_WORKFLOW = {
  billable: false,
  id: PND_ATTACK_DISCOVERY_FP_TP_WORKFLOW_ID,
  management: PND_RULE_WORKFLOW_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: ATTACK_DISCOVERY_FP_TP_YAML,
} as const satisfies ManagedWorkflowDefinition;
