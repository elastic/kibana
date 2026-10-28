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
 * Version 6 clusters attacks before the review fan-out and attaches a duplicate
 * to the Investigation that already describes it.
 *
 * Version 7 passes the detection alert ids of those same-run attacks to the
 * review, which tags them with its own when the verdict escalates.
 *
 * Version 8 reviews every generated attack when fingerprint matching fails, so
 * one matcher error does not drop the run. The YAML change rolls out through
 * `definitionHash`; the bump is the deliberate signal.
 *
 * Version 9 passes the discovery ids of same-run siblings so the review can close
 * them with the canonical attack.
 *
 * Version 10 passes why a review is linked to an earlier Investigation, so the
 * journal can tell a built-in account from a closed false positive.
 *
 * Version 11 raises the generation budget to 12h and forwards the prorated alert
 * cap. The YAML change already rolls out through `definitionHash`; the bump is
 * the deliberate signal of that rollout.
 */
export const ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW = {
  billable: true,
  id: ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 12,
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
 *
 * Version 12 journals `related_investigation_id` when a closed false positive
 * matched on entities only, and tags and acknowledges `sibling_alert_ids` with
 * the review's own alerts when the verdict escalates, so a later run skips the
 * whole batch.
 *
 * Version 13 closes `sibling_attack_discovery_ids` with the canonical attack when
 * the verdict is a false positive or the analyst declines escalation.
 *
 * Version 14 journals a built-in account link separately from a closed false
 * positive. A match that is only SYSTEM, Administrator, or root on one host
 * is reviewed on its own.
 *
 * Version 16 journals impact as separate host and user counts from this attack.
 */
export const ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW = {
  billable: true,
  id: ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 16,
  yaml: ATTACK_DISCOVERY_REVIEW_YAML,
} as const satisfies ManagedWorkflowDefinition;

/**
 * Attaches a duplicate Attack Discovery to an existing Investigation and skips
 * FP/TP. Internal, like the other children the runner executes: it owns no trigger.
 *
 * Version 2 journals the match, the attachment attempt, and alert retirement as
 * separate notes. The retirement note follows the review: it is written only for
 * a handed-off true positive or inconclusive.
 *
 * Version 3 records the continuation's hosts and users on the Investigation,
 * because an attached attack no longer gets its own review.
 *
 * Version 4 waits for the review to create the Investigation instead of creating
 * it here, and acknowledges the open alerts it tags.
 *
 * Version 5 keeps that wait open for 15 minutes, the same window the matcher
 * treats a missing Investigation as in flight. The YAML change rolls out
 * through `definitionHash`; the bump is the deliberate signal.
 *
 * Version 7 journals impact as separate host and user counts from this attack,
 * merged into the Investigation's impact.
 */
export const ALERTZERO_ATTACK_DISCOVERY_ATTACH_WORKFLOW = {
  billable: true,
  id: ALERTZERO_ATTACK_DISCOVERY_ATTACH_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 7,
  yaml: ATTACK_DISCOVERY_ATTACH_YAML,
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
 * `az:ad_correlated`. Version 6 gives the child a 12h workflow timeout and
 * limits retrieval to the prorated alert cap. Version 7 marks the workflow billable.
 * Version 8 passes `generation_source`, so the Worker's attacks stop deduplicating
 * against a manual run by the same user. Each bump is a deliberate
 * rollout signal; the YAML change alone already rolls out through `definitionHash`.
 */
export const ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW = {
  billable: true,
  id: ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 8,
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
