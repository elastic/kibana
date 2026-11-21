/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW_ID } from './forensics_close_investigation_gate';
import { ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW_ID } from './forensics_proposal_gate';
import { ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID } from './forensics_run_endpoint_analysis';

export {
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
} from './forensics_endpoint_analysis';
export {
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW,
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
} from './forensics_run_endpoint_analysis';
export {
  ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW,
  ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW_ID,
} from './forensics_proposal_gate';
export {
  ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW,
  ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW_ID,
} from './forensics_close_investigation_gate';

/**
 * The forensic pass the per-space Endpoint analysis worker dispatches, the
 * per-proposal gate that pass dispatches in turn, and the close gate the
 * per-proposal gate (or the pass, when it proposed nothing) dispatches last.
 * Installed globally so every space's worker shares one copy; they inherit the
 * dispatching worker's space at run time.
 */
export const ALERTZERO_FORENSICS_WORKFLOW_IDS = [
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW_ID,
  ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW_ID,
] as const;
