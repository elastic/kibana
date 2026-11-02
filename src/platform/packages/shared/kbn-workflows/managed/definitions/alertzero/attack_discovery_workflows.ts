/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ATTACK_DISCOVERY_ATTACH_YAML from './attack_discovery_attach.yaml';
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
/**
 * The `generation_source` the Worker's batched generation passes to
 * `security.attack-discovery.run`. It contributes to the attack hash, so the
 * Worker's attacks never dedupe against a manual Attack Discovery run by the same
 * user. YAML cannot import this: keep the literal in
 * `attack_discovery_batched_generation.yaml` equal to it (a test checks).
 */
export const ALERTZERO_ATTACK_DISCOVERY_WORKER_GENERATION_SOURCE = 'watch_floor_ad_worker';
export const ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID =
  'system-security-attack-discovery-fp-tp-analysis';
export const ALERTZERO_ATTACK_DISCOVERY_ATTACH_WORKFLOW_ID =
  'system-security-attack-discovery-attach';

/**
 * Scheduled Attack Discovery run for one space. Requires `schedule_interval`
 * and passes it to batched generation as the lookback. Matches fingerprints,
 * attaches a continuation to the Investigation that already describes it, and
 * reviews the rest. A failed match reviews every generated attack. Passes each
 * attach its autonomy and the flags and fields it uses when the Investigation
 * is missing, unreadable, or no longer the one it matched.
 */
export const ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW = {
  billable: true,
  id: ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 22,
  yaml: ATTACK_DISCOVERY_RUNNER_YAML,
} as const satisfies ManagedWorkflowDefinition;

/**
 * Reviews one Attack Discovery. Opens an Investigation, attaches the discovery
 * and its alerts, and runs FP/TP analysis. A false positive acknowledges the
 * detection alerts and tags `az:ad_fp_chain`, then closes the attack. A true
 * positive or inconclusive waits for the gate. Approval or any dismissal
 * acknowledges the alerts still open and tags `az:ad_correlated`, and a
 * false-positive dismissal also tags `az:ad_fp_chain`. Those gate writes run
 * before the attack is closed. An expired proposal, a failed analysis, or a
 * failed gate writes neither tag and leaves the Investigation open.
 */
export const ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW = {
  billable: true,
  id: ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 25,
  yaml: ATTACK_DISCOVERY_REVIEW_YAML,
} as const satisfies ManagedWorkflowDefinition;

/**
 * Attaches one Attack Discovery to an Investigation that already describes the
 * same attack, and skips FP/TP. Waits for that Investigation, then journals the
 * match, the evidence, and any alert tagging. If it is still missing, starts a
 * review. Retargets the fingerprint when a confirmed 404 is at least 15 minutes
 * old and the document still points at that Investigation. A younger fingerprint
 * stays in place. A lost retarget, or a failed read, writes this attack's own
 * fingerprint. A re-read that finds the Investigation closed, expired, or failed
 * starts a review instead of attaching.
 */
export const ALERTZERO_ATTACK_DISCOVERY_ATTACH_WORKFLOW = {
  billable: true,
  id: ALERTZERO_ATTACK_DISCOVERY_ATTACH_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 20,
  yaml: ATTACK_DISCOVERY_ATTACH_YAML,
} as const satisfies ManagedWorkflowDefinition;

/**
 * Batched Attack Discovery generation, invoked by the runner via
 * `workflow.execute`. Owns no trigger, so unlike the runner and the review it
 * uses the internal-workflow management profile: enablement is enforced rather
 * than restorable.
 *
 * Retrieves the open alerts for `lookback`, plus one minute, in batches. Skips
 * alerts tagged `az:ad_correlated` or `az:ad_fp_chain`. Passes
 * `generation_source` so these attacks do not dedupe against a manual run by
 * the same user.
 */
export const ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW = {
  billable: true,
  id: ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 13,
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
  billable: true,
  id: ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 3,
  yaml: ATTACK_DISCOVERY_FP_TP_ANALYSIS_YAML,
} as const satisfies ManagedWorkflowDefinition;
