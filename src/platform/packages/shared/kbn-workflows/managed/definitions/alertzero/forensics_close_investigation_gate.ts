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
import FORENSICS_CLOSE_INVESTIGATION_GATE_YAML from './forensics_close_investigation_gate.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW_ID =
  'system-security-forensics-close-investigation-gate';

/**
 * Child dispatched via `workflow.executeAsync` by the containment gate
 * (`forensics_proposal_gate.yaml`) once every Proposal on the Investigation has
 * settled, and by the Endpoint analysis run when it proposed nothing. Raises one
 * always-gated "Close Investigation" Proposal through the AlertZero bridge, deduped
 * per Investigation by `alertzero.resolveProposals`, and journals the decision.
 * Owns no trigger of its own, so enablement is `enforced`.
 */
export const ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW = {
  billable: false,
  id: ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 2,
  yaml: FORENSICS_CLOSE_INVESTIGATION_GATE_YAML,
} as const satisfies ManagedWorkflowDefinition;
