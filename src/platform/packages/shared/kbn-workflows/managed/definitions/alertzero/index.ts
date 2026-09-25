/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW_ID } from './actions/action_add_rule_exception';
import { ALERTZERO_ACTION_CREATE_RULE_WORKFLOW_ID } from './actions/action_create_detection_rule';
import { ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID } from './actions/action_edit_detection_rule';
import { ALERTZERO_ACTION_HANDOFF_TO_FORENSICS_WORKFLOW_ID } from './actions/action_handoff_to_forensics';
import {
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
} from './actions/defend';
import {
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
} from './attack_discovery_workflows';
import { ALERTZERO_WORKER_DETECTION_RULE_CREATION_WORKFLOW_ID } from './detection_rule_creation';
import { ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID } from './detection_rule_tuning';
import { ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID } from './floor_alert_triage';
import { ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID } from './floor_attack_discovery';
import { ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID } from './forensics_endpoint_analysis';
import { ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID } from './forensics_run_endpoint_analysis';
import { ALERTZERO_HUNT_WORKFLOW_ID } from './hunt';
import { ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID } from './find_or_create_investigation';
import { ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID } from './hunt_package_report';
import { ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID } from './hunt_proposal_gate';
import { ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID } from './hunt_continuous_threat_hunt';
import { ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID } from './journal_note';
import {
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID,
  ALERTZERO_RULE_CREATION_WORKFLOW_ID,
  ALERTZERO_RULE_PREVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
} from './rule_workflows';

export {
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW,
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_COVERAGE_WORKER_WORKFLOW,
  ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID,
  ALERTZERO_RULE_CREATION_WORKFLOW,
  ALERTZERO_RULE_CREATION_WORKFLOW_ID,
  ALERTZERO_RULE_PREVIEW_WORKFLOW,
  ALERTZERO_RULE_PREVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
} from './rule_workflows';
export {
  ALERTZERO_ACTION_CREATE_RULE_WORKFLOW,
  ALERTZERO_ACTION_CREATE_RULE_WORKFLOW_ID,
} from './actions/action_create_detection_rule';
export {
  ALERTZERO_ACTION_EDIT_RULE_WORKFLOW,
  ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID,
} from './actions/action_edit_detection_rule';

export {
  ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW,
  ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW_ID,
} from './actions/action_add_rule_exception';
export {
  ALERTZERO_ACTION_HANDOFF_TO_FORENSICS_WORKFLOW,
  ALERTZERO_ACTION_HANDOFF_TO_FORENSICS_WORKFLOW_ID,
} from './actions/action_handoff_to_forensics';
export {
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW,
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW,
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
} from './actions/defend';
export {
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
} from './attack_discovery_workflows';
export {
  ALERTZERO_JOURNAL_NOTE_WORKFLOW,
  ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID,
} from './journal_note';
export { ALERTZERO_HUNT_WORKFLOW, ALERTZERO_HUNT_WORKFLOW_ID } from './hunt';
export {
  ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW,
  ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID,
} from './find_or_create_investigation';
export {
  ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW,
  ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID,
} from './hunt_package_report';
export {
  ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW,
  ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID,
} from './hunt_proposal_gate';
export {
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW,
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
} from './hunt_continuous_threat_hunt';
export {
  ALERTZERO_WORKER_DETECTION_RULE_CREATION_WORKFLOW,
  ALERTZERO_WORKER_DETECTION_RULE_CREATION_WORKFLOW_ID,
} from './detection_rule_creation';
export {
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW,
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
} from './detection_rule_tuning';
export {
  ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW,
  ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
} from './floor_alert_triage';
export {
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
} from './floor_attack_discovery';
export {
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
} from './forensics_endpoint_analysis';
export {
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW,
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
} from './forensics_run_endpoint_analysis';

export const ALERTZERO_MANAGED_WORKER_WORKFLOW_IDS = [
  ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
  ALERTZERO_WORKER_DETECTION_RULE_CREATION_WORKFLOW_ID,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
] as const;

export const ALERTZERO_RULE_WORKFLOW_IDS = [
  ALERTZERO_RULE_PREVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_CREATION_WORKFLOW_ID,
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
] as const;

/**
 * Attack Discovery worker chain: the global workflow that runs generation and fans
 * out per attack, the batched generation workflow it delegates generation to, the
 * per-attack review workflow it launches, and the FP/TP analysis that review calls
 * for its verdict. Installed globally so the per-space Watch Floor worker can
 * dispatch to them.
 */
export const ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS = [
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID,
] as const;

/**
 * The forensic pass the per-space Endpoint analysis worker dispatches. Installed
 * globally so every space's worker shares one copy; it inherits the dispatching
 * worker's space at run time.
 */
export const ALERTZERO_FORENSICS_WORKFLOW_IDS = [
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
] as const;

/**
 * Hunt Watch's children invoked via `workflow.execute`/`workflow.executeAsync`
 * from the tagged Worker (`hunt_continuous_threat_hunt.yaml`) or from each
 * other: the hunt child (former 3D, now on PR 4, `system-security-hunt-execute`),
 * the find-or-create-Investigation child (added Phase 0 task 7: the deterministic
 * id it mints needs a uuidv5 hash Liquid cannot compute, so it cannot live inline
 * in the Worker's `parallel` branch), the packaging child (Phase 5: wraps
 * `hunt.packageReport`, fans mint payloads out to the proposal-gate child, closes
 * the Investigation on a clean run), and the proposal-gate child (Phase 6: wraps
 * `system-create-proposal`'s single `waitForApproval`, closes the Investigation
 * on settlement). Own no trigger, so — like `journal_note` above — all four must
 * be installed globally for the calling `workflow.execute`/`workflow.executeAsync`
 * steps to resolve them. Correlation (`system-security-hunt-correlation`) lands
 * with 3B under R.7. `find_or_create_investigation` and `hunt` stay untagged
 * (Worker-branch-internal plumbing); `package_report` and `proposal_gate` carry
 * `security` + `continuous-threat-hunt` (feature children, per the plan's
 * tag convention) for Workflows-list findability.
 */
export const ALERTZERO_HUNT_CHILD_WORKFLOW_IDS = [
  ALERTZERO_HUNT_WORKFLOW_ID,
  ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID,
  ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID,
  ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID,
] as const;

/**
 * Action workflows AlertZero may propose. Discovery is normally by the generic
 * `action` tag; this list is the install set and the fallback.
 */
export const ALERTZERO_ACTION_WORKFLOW_IDS = [
  ALERTZERO_ACTION_CREATE_RULE_WORKFLOW_ID,
  ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID,
  ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW_ID,
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_HANDOFF_TO_FORENSICS_WORKFLOW_ID,
] as const;
