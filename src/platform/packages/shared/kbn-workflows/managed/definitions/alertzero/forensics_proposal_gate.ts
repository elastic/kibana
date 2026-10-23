/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
} from './constants';
import FORENSICS_PROPOSAL_GATE_YAML from './forensics_proposal_gate.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW_ID =
  'system-security-forensics-proposal-gate';

/**
 * Child dispatched via `workflow.executeAsync`, one per containment Proposal, by the
 * Endpoint analysis run (`forensics_run_endpoint_analysis.yaml`). Wraps
 * `system-create-alertzero-proposal`'s single `waitForApproval`, then closes the
 * Investigation through the investigations status route once every Proposal on it is
 * decided. Separate from `hunt_proposal_gate.yaml` because that gate closes with an
 * owner-only metadata patch, which only works when the gate runs as the account that
 * opened the Investigation; Endpoint analysis closes Investigations other Workers opened.
 * Owns no trigger of its own, so enablement is `enforced` (a disabled child would
 * silently break its dispatcher).
 */
export const ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW = {
  billable: false,
  id: ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 4,
  yaml: FORENSICS_PROPOSAL_GATE_YAML,
} as const satisfies ManagedWorkflowDefinition;
