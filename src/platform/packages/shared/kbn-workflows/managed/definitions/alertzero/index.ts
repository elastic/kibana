/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW_ID } from './actions/action_add_rule_exception';
import { ALERTZERO_ACTION_CLOSE_ALERTS_FP_WORKFLOW_ID } from './actions/action_close_alerts_false_positive';
import { ALERTZERO_ACTION_CREATE_RULE_WORKFLOW_ID } from './actions/action_create_detection_rule';
import { ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID } from './actions/action_edit_detection_rule';
import { ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW_ID } from './actions/action_enable_detection_rule';
import { ALERTZERO_ACTION_HANDOFF_TO_FORENSICS_WORKFLOW_ID } from './actions/action_handoff_to_forensics';
import { ALERTZERO_ACTION_INSTALL_PREBUILT_RULE_WORKFLOW_ID } from './actions/action_install_prebuilt_rule';
import {
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_MEMORY_DUMP_WORKFLOW_ID,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
} from './actions/defend';
import { ALERTZERO_ACTION_SET_ASSET_CRITICALITY_WORKFLOW_ID } from './actions/identity';
import {
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
} from './attack_discovery_workflows';
import { ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID } from './create_proposal';
import { ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID } from './detection_rule_coverage';
import { ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID } from './detection_rule_tuning';
import { ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID } from './find_or_create_investigation';
import { ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID } from './floor_alert_triage';
import { ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID } from './floor_alert_triage_batch';
import { ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID } from './floor_alert_triage_review';
import { ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID } from './floor_attack_discovery';
import { ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID } from './forensics_endpoint_analysis';
import { ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID } from './forensics_run_endpoint_analysis';
import { ALERTZERO_HUNT_WORKFLOW_ID } from './hunt';
import { ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID } from './hunt_continuous_threat_hunt';
import { ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID } from './hunt_package_report';
import { ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID } from './hunt_proposal_gate';
import { ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW_ID } from './investigation_summary';
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
  ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW,
  ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW_ID,
} from './actions/action_enable_detection_rule';
export {
  ALERTZERO_ACTION_INSTALL_PREBUILT_RULE_WORKFLOW,
  ALERTZERO_ACTION_INSTALL_PREBUILT_RULE_WORKFLOW_ID,
} from './actions/action_install_prebuilt_rule';
export {
  ALERTZERO_ACTION_CLOSE_ALERTS_FP_WORKFLOW,
  ALERTZERO_ACTION_CLOSE_ALERTS_FP_WORKFLOW_ID,
} from './actions/action_close_alerts_false_positive';
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
  ALERTZERO_ACTION_MEMORY_DUMP_WORKFLOW,
  ALERTZERO_ACTION_MEMORY_DUMP_WORKFLOW_ID,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
} from './actions/defend';
export {
  ALERTZERO_ACTION_SET_ASSET_CRITICALITY_WORKFLOW,
  ALERTZERO_ACTION_SET_ASSET_CRITICALITY_WORKFLOW_ID,
} from './actions/identity';
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
export {
  ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW,
  ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW_ID,
} from './investigation_summary';
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
  ALERTZERO_CREATE_PROPOSAL_WORKFLOW,
  ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID,
} from './create_proposal';
export {
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW,
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
} from './hunt_continuous_threat_hunt';
export {
  ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW,
  ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID,
} from './detection_rule_coverage';
export {
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW,
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
} from './detection_rule_tuning';
export {
  ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW,
  ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
} from './floor_alert_triage';
export {
  ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW,
  ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID,
} from './floor_alert_triage_batch';
export {
  ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW,
  ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID,
} from './floor_alert_triage_review';
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
  ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID,
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
 * The batch and the closure review the per-space Alert Triage sweep starts. Installed globally so
 * every space's sweep shares one copy; each inherits the starting workflow's space at run time.
 */
export const ALERTZERO_ALERT_TRIAGE_WORKFLOW_IDS = [
  ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID,
  ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID,
] as const;

/**
 * Hunt Watch's children invoked via `workflow.execute`/`workflow.executeAsync`
 * from the tagged Worker (`hunt_continuous_threat_hunt.yaml`) or from each
 * other: the hunt child (`system-security-hunt-execute`), the
 * find-or-create-Investigation child (the deterministic id it mints needs a
 * uuidv5 hash Liquid cannot compute, so it cannot live inline in the Worker's
 * `parallel` branch), the packaging child (wraps `hunt.packageReport`, fans mint
 * payloads out to the proposal-gate child, closes the Investigation on a clean
 * run), and the proposal-gate child (wraps `system-create-proposal`'s single
 * `waitForApproval`, closes the Investigation on settlement). Own no trigger,
 * so — like `journal_note` above — all four must be installed globally for the
 * calling `workflow.execute`/`workflow.executeAsync` steps to resolve them.
 * Cross-report correlation (`system-security-hunt-correlation`) is not part of
 * this set yet. `find_or_create_investigation` and `hunt` stay untagged
 * (Worker-branch-internal plumbing); `package_report` and `proposal_gate` carry
 * `security` + `continuous-threat-hunt` as feature children, for Workflows-list
 * findability.
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
  ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW_ID,
  ALERTZERO_ACTION_INSTALL_PREBUILT_RULE_WORKFLOW_ID,
  ALERTZERO_ACTION_CLOSE_ALERTS_FP_WORKFLOW_ID,
  ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID,
  ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW_ID,
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_SET_ASSET_CRITICALITY_WORKFLOW_ID,
  ALERTZERO_ACTION_MEMORY_DUMP_WORKFLOW_ID,
  ALERTZERO_ACTION_HANDOFF_TO_FORENSICS_WORKFLOW_ID,
] as const;

/**
 * The bridge every AlertZero workflow raises proposals through. Installed
 * globally because both the rule tuning and attack discovery reviews invoke it.
 */
export const ALERTZERO_PROPOSAL_WORKFLOW_IDS = [ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID] as const;

/**
 * Card summary for investigation and escalation conversations. Installed globally
 * and shipped disabled; enabling it turns the reader on in every space.
 */
export const ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW_IDS = [
  ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW_ID,
] as const;
