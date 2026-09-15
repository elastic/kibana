/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ATTACK_DISCOVERY_GENERATION_YAML from './attack_discovery_generation.yaml';
import ATTACK_DISCOVERY_REVIEW_YAML from './attack_discovery_review.yaml';
import ATTACK_DISCOVERY_RUNNER_YAML from './attack_discovery_runner.yaml';
import {
  ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
} from './constants';
import type { ManagedWorkflowDefinition } from '../../types';

// `system-attack-discovery-generation` is already taken by the discoveries plugin,
// so these mirror the `system-security-rule-tuning-worker` / `-review` pair instead.
// The `-generation` suffix below is free because of the `security-` segment.
export const ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID =
  'system-security-attack-discovery-worker';
export const ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID =
  'system-security-attack-discovery-review';
export const ALERTZERO_ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID =
  'system-security-attack-discovery-generation';

export const ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW = {
  billable: false,
  id: ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 2,
  yaml: ATTACK_DISCOVERY_RUNNER_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW = {
  billable: false,
  id: ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: ATTACK_DISCOVERY_REVIEW_YAML,
} as const satisfies ManagedWorkflowDefinition;

/**
 * Batched Attack Discovery generation, invoked by the runner via
 * `workflow.execute`. Owns no trigger, so unlike the runner and the review it
 * uses the internal-workflow management profile: enablement is enforced rather
 * than restorable.
 */
export const ALERTZERO_ATTACK_DISCOVERY_GENERATION_WORKFLOW = {
  billable: false,
  id: ALERTZERO_ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: ATTACK_DISCOVERY_GENERATION_YAML,
} as const satisfies ManagedWorkflowDefinition;
