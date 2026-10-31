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
 *
 * Version 12 marks the worker billable.
 *
 * Version 13 passes `tag_fp_chain_alerts` so a continuation attached to an
 * Investigation already closed as a false positive is tagged `az:ad_fp_chain`
 * and acknowledged, instead of left open.
 *
 * Version 14 passes `tag_in_review_alerts` so a continuation of an open
 * Investigation with no retiring verdict is tagged `az:ad_in_review` and left
 * unacknowledged until the review decides.
 *
 * Version 15 passes the worker's schedule interval as generation's lookback.
 *
 * Version 16 stops passing `tag_in_review_alerts`. The next scheduled tick does
 * not re-read this tick's alerts, so an open review attaches without a tag.
 *
 * Version 17 passes `autonomy` into the attach workflow, so a review started
 * after a missed attach keeps this worker's autonomy.
 *
 * Version 18 requires `schedule_interval`. Generation uses it as the lookback,
 * so a hand run that omits it fails here instead of passing an empty duration.
 *
 * Version 19 keeps that lookback and relies on generation reading one minute
 * further, so a tick covers the seam with the previous one. A tick that does
 * not finish is not retried.
 *
 * Version 20 passes `fingerprint_pending`. An attach whose Investigation is
 * not readable yet writes the continuation's alert ids itself, after the wait.
 *
 * Version 21 passes the fields a stale attach uses to write its own fingerprint
 * when the Investigation has closed, expired, or failed since the match.
 *
 * Version 22 passes `retarget_if_missing`. A failed Investigation read waits,
 * but only a confirmed 404 may retarget the fingerprint after that wait.
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
 * Version 15 marks the review billable.
 *
 * Version 16 journals impact as separate host and user counts from this attack.
 *
 * Version 17 acknowledges and tags `az:ad_fp_chain` the detection alerts behind a
 * false-positive attack, without closing them.
 *
 * Version 18 retires continuation alerts recorded on the fingerprint, replaces
 * `az:ad_in_review` with the verdict tag, writes `az:ad_fp_chain` when an analyst
 * dismisses the proposal as a false positive, and removes the interim tag when
 * analysis fails or the proposal expires.
 *
 * Version 19 releases continuations that arrived while the gate was parked.
 * Approval swaps `az:ad_in_review` for `az:ad_correlated` and acknowledges the
 * alerts still open. Any other dismissal removes the interim tag and leaves
 * those alerts open.
 *
 * Version 20 limits both fingerprint reads to the executing space. The index is
 * shared, and the Investigation id has no space component.
 *
 * Version 21 drops `az:ad_in_review`. A verdict still tags and acknowledges.
 * Approval still tags continuations that arrived during the gate
 * `az:ad_correlated` and acknowledges the ones still open. A false-positive
 * dismissal still writes `az:ad_fp_chain` without a new acknowledgement.
 *
 * Version 22 journals an attach that waited 15 minutes and never found its
 * Investigation. That attack is reviewed on its own, and the note names the
 * Investigation it could not join.
 *
 * Version 23 tags and acknowledges at the decision. A false positive still
 * retires its alerts at the verdict, under `az:ad_fp_chain`. A true positive
 * or inconclusive waits for the gate. Approval and any dismissal acknowledge
 * the alerts still open. A false-positive dismissal writes both tags. An
 * expired proposal or a failed analysis writes neither, and the Investigation
 * stays open. A later attack does not attach to a closed Investigation, an
 * expired proposal, or a failed analysis.
 *
 * Version 24 writes `GATE FAILED` when the escalation gate step fails. A later
 * match treats that the same as a failed analysis. A cancel or a restart still
 * writes nothing.
 *
 * Version 25 tags and acknowledges a gate decision before `close_attack_declined`.
 * That step fails the run when the attack close fails, and the alerts are still
 * retired.
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
 * Version 6 marks the attach workflow billable.
 *
 * Version 7 journals impact as separate host and user counts from this attack,
 * merged into the Investigation's impact.
 *
 * Version 8 tags `az:ad_fp_chain` and acknowledges the open alerts when the
 * matched Investigation is already a closed false positive, and journals that
 * retirement.
 *
 * Version 9 tags `az:ad_in_review` and does not acknowledge when the matched
 * Investigation is still open and has no retiring verdict.
 *
 * Version 10 reads the tagged alerts back and journals those counts, including
 * zero, and says a closed false positive is already closed rather than still
 * under investigation.
 *
 * Version 11 re-reads the Investigation immediately before writing
 * `az:ad_in_review` and skips that tag when the review has since failed,
 * expired, closed, or been handed off. An unreadable Investigation stays
 * untagged.
 *
 * Version 12 drops that interim tag. An open review attaches its evidence and
 * leaves the alerts untagged. A closed false positive and a handed-off or
 * otherwise closed review still tag and acknowledge.
 *
 * Version 13 starts a review when the Investigation is still missing after the
 * 15-minute wait, and skips the attachment writes. The review journals the miss.
 *
 * Version 14 keeps a pending continuation's alert ids off the fingerprint until
 * that wait succeeds. If the Investigation is still missing, the existing
 * fingerprint is retargeted at this attack. A second fingerprint is not created.
 *
 * Version 15 re-reads the Investigation before attaching. A close, an expiry,
 * or a failed analysis or gate starts a review and writes that review's
 * fingerprint. A handoff found by the re-read tags `az:ad_correlated`.
 *
 * Version 16 retargets only while the fingerprint still points at the earlier
 * Investigation. Alert ids, expiry, and the last alert become this attack's.
 *
 * Version 17 retargets only when the matcher confirmed the Investigation was
 * missing. A privilege error or a 5xx starts a review and leaves the fingerprint.
 *
 * Version 18 writes that review's own fingerprint when the failed read's wait
 * still fails. A confirmed 404 still retargets and does not create a second one.
 *
 * Version 19 leaves a fingerprint younger than 15 minutes in place. The wait
 * can end before that window, and retargeting then would take a review that
 * may still be starting.
 */
export const ALERTZERO_ATTACK_DISCOVERY_ATTACH_WORKFLOW = {
  billable: true,
  id: ALERTZERO_ATTACK_DISCOVERY_ATTACH_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 19,
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
 * limits retrieval to the prorated alert cap. Version 7 marks batched generation
 * billable. Version 8 also skips `az:ad_fp_chain`, the tag a false-positive
 * review writes. Version 9 also skips `az:ad_in_review`, the interim tag a
 * continuation used to write before the verdict. Version 10 records that the
 * runner supplies the schedule interval as `lookback`. Version 11 drops
 * `az:ad_in_review` from the exclusion list: the scheduled worker no longer
 * writes it. Version 12 reads one minute past `lookback`, so a tick covers
 * the seam with the previous one. Version 13 passes `generation_source`, so
 * the Worker's attacks stop deduplicating against a manual run by the same
 * user. Each bump is a deliberate
 * rollout signal; the YAML change alone already rolls out through `definitionHash`.
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
