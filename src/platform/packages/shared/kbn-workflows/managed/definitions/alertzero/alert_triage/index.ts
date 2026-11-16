/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID } from './floor_alert_triage_batch';
import { ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID } from './floor_alert_triage_review';
import { ALERTZERO_FLOOR_ALERT_TRIAGE_REVOKE_DECISION_WORKFLOW_ID } from './floor_alert_triage_revoke_decision';

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
  ALERTZERO_FLOOR_ALERT_TRIAGE_REVOKE_DECISION_WORKFLOW,
  ALERTZERO_FLOOR_ALERT_TRIAGE_REVOKE_DECISION_WORKFLOW_ID,
} from './floor_alert_triage_revoke_decision';

/**
 * The batch and the closure review the per-space Alert Triage sweep starts, and the revoke workflow
 * that takes back a decision. Installed globally so
 * every space's sweep shares one copy; each inherits the starting workflow's space at run time.
 */
export const ALERTZERO_ALERT_TRIAGE_WORKFLOW_IDS = [
  ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID,
  ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_FLOOR_ALERT_TRIAGE_REVOKE_DECISION_WORKFLOW_ID,
] as const;
