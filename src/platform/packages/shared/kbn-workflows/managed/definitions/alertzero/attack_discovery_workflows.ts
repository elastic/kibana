/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ATTACK_DISCOVERY_BATCHED_GENERATION_YAML from './attack_discovery_batched_generation.yaml';
import ATTACK_DISCOVERY_FP_TP_ANALYSIS_YAML from './attack_discovery_fp_tp_analysis.yaml';
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
// The `-batched-generation` suffix below does not collide with it — both the
// `security-` segment and the `batched-` qualifier keep the two distinct.
export const ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID =
  'system-security-attack-discovery-worker';
export const ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID =
  'system-security-attack-discovery-review';
export const ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID =
  'system-security-attack-discovery-batched-generation';
export const ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID =
  'system-security-attack-discovery-fp-tp-analysis';

export const ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW = {
  billable: false,
  id: ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 5,
  yaml: ATTACK_DISCOVERY_RUNNER_YAML,
} as const satisfies ManagedWorkflowDefinition;

/**
 * Version 7 carries the `resolve_display_text` step, which reads the discovery from
 * the Attack Discovery find API so the Investigation title, its summary, the journal
 * and the proposal's title and comment show its text with field tokens rendered and
 * original values restored. Bumped as a deliberate rollout signal for that step; the YAML
 * change alone already rolls out through `definitionHash`.
 *
 * Version 8 carries the impact steps, which record the hosts and users an attack
 * touched on its Investigation, so the landing page's Impact pills match Attack
 * Discovery proposals. Version 9 acknowledges and tags `az:ad_correlated` the
 * detection alerts behind a true-positive or inconclusive attack.
 *
 * Version 10 carries the telemetry report steps.
 *
 * Version 11 space-scopes the proposal read-back so a named space records who decided and why.
 */
export const ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW = {
  billable: false,
  id: ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 11,
  yaml: ATTACK_DISCOVERY_REVIEW_YAML,
} as const satisfies ManagedWorkflowDefinition;

/**
 * Batched Attack Discovery generation, invoked by the runner via
 * `workflow.execute`. Owns no trigger, so unlike the runner and the review it
 * uses the internal-workflow management profile: enablement is enforced rather
 * than restorable.
 *
 * Version 3 carried the YAML's switch to a per-batch ES|QL retrieval, which lets
 * each batch persist the replacements its discoveries use. Version 4 turns off the
 * run step's ground-truth gate, so false-positive triage happens only in the
 * review's FP/TP analysis. Version 5 skips alerts the review tagged
 * `az:ad_correlated`. Each bump is a deliberate rollout signal; the YAML change
 * alone already rolls out through `definitionHash`.
 */
export const ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW = {
  billable: false,
  id: ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 5,
  yaml: ATTACK_DISCOVERY_BATCHED_GENERATION_YAML,
} as const satisfies ManagedWorkflowDefinition;

/**
 * FP/TP analysis of one Attack Discovery, invoked by the review via
 * `workflow.execute`. Owns no trigger, so like batched generation it uses the
 * internal-workflow management profile: enablement is enforced rather than
 * restorable, because a disabled analysis would leave the review recording every
 * attack as a failure.
 *
 * The version is the prompt version. Execution output echoes it as
 * `workflow_version`, so a result traces back to the prompt that produced it.
 */
export const ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW = {
  billable: false,
  id: ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 2,
  yaml: ATTACK_DISCOVERY_FP_TP_ANALYSIS_YAML,
} as const satisfies ManagedWorkflowDefinition;
