/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_ATTACK_DISCOVERY_ATTACH_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
} from './attack_discovery_workflows';
import { ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW_ID } from './close_attack_and_alerts';
import { ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID } from '../journal_note';

export {
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_GENERATION_SOURCE,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_ATTACH_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_ATTACH_WORKFLOW_ID,
} from './attack_discovery_workflows';
export {
  ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW,
  ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW_ID,
} from './close_attack_and_alerts';
export {
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
} from './floor_attack_discovery';

/**
 * Attack Discovery worker chain: the global workflow that runs generation and fans
 * out per attack, the batched generation workflow it delegates generation to, the
 * per-attack review workflow it launches, and the FP/TP analysis that review calls
 * for its verdict. Installed globally so the per-space Watch Floor worker can
 * dispatch to them. The close-attack-and-alerts child is here because it retires
 * an attack with its alerts under one reason, which the Close Investigation
 * action does today and the review's false-positive arm is meant to share.
 */
export const ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS = [
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_ATTACH_WORKFLOW_ID,
  ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID,
  ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW_ID,
] as const;
