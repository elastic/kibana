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
import HUNT_PROPOSAL_GATE_YAML from './hunt_proposal_gate.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID = 'system-security-hunt-proposal-gate';

/**
 * Child dispatched by PR 4's packaging child (`hunt_package_report.yaml`) via
 * `workflow.executeAsync`, one per minted Proposal. Wraps
 * `system-create-proposal`'s single `waitForApproval`, then closes the
 * Investigation on settlement. Tagged `security` + `continuous-threat-hunt`
 * (not `watch`/`watch-hunt`, which stays Worker-only) for Workflows-list
 * findability, matching `hunt_package_report.yaml` and every other Watch's
 * own feature children. Owns no trigger of its own, so enablement is
 * `enforced` (a disabled child would silently break its dispatcher).
 */
export const ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW = {
  billable: false,
  id: ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: HUNT_PROPOSAL_GATE_YAML,
} as const satisfies ManagedWorkflowDefinition;
