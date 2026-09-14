/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import BATCHED_ATTACK_DISCOVERY_YAML from './batched_attack_discovery.yaml';
import {
  ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
} from './constants';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_BATCHED_ATTACK_DISCOVERY_WORKFLOW_ID =
  'system-security-batched-attack-discovery';

/**
 * Batched Attack Discovery generation, invoked by the AD Worker via
 * `workflow.execute`. Owns no trigger, so it uses the internal-workflow
 * management profile: enablement is enforced rather than restorable.
 */
export const ALERTZERO_BATCHED_ATTACK_DISCOVERY_WORKFLOW = {
  billable: false,
  id: ALERTZERO_BATCHED_ATTACK_DISCOVERY_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 2,
  yaml: BATCHED_ATTACK_DISCOVERY_YAML,
} as const satisfies ManagedWorkflowDefinition;
