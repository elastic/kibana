/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PND_MANAGED_WORKFLOW_PLUGIN_ID, PND_WATCH_WORKER_MANAGEMENT } from './constants';
import CORRELATION_YAML from './correlation.yaml';
import DARK_PROPOSAL_GATE_YAML from './dark_proposal_gate.yaml';
import HUNT_YAML from './hunt.yaml';
import PACKAGE_REPORT_YAML from './package_report.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

// Dark Watch child workflows — static yaml, untagged domain composition under
// continuous_threat_hunt (or, for dark_proposal_gate, started server-side by
// start_proposal_gates). No Watch tags: they are not catalog members.

export const PND_DARK_HUNT_WORKFLOW_ID = 'system-security-dark-hunt';
export const PND_DARK_CORRELATION_WORKFLOW_ID = 'system-security-dark-correlation';
export const PND_DARK_PACKAGE_REPORT_WORKFLOW_ID = 'system-security-dark-package-report';
export const PND_DARK_PROPOSAL_GATE_WORKFLOW_ID = 'system-security-dark-proposal-gate';

export const PND_DARK_HUNT_WORKFLOW = {
  billable: false,
  id: PND_DARK_HUNT_WORKFLOW_ID,
  management: PND_WATCH_WORKER_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: HUNT_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_DARK_CORRELATION_WORKFLOW = {
  billable: false,
  id: PND_DARK_CORRELATION_WORKFLOW_ID,
  management: PND_WATCH_WORKER_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: CORRELATION_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_DARK_PACKAGE_REPORT_WORKFLOW = {
  billable: false,
  id: PND_DARK_PACKAGE_REPORT_WORKFLOW_ID,
  management: PND_WATCH_WORKER_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: PACKAGE_REPORT_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_DARK_PROPOSAL_GATE_WORKFLOW = {
  billable: false,
  id: PND_DARK_PROPOSAL_GATE_WORKFLOW_ID,
  management: PND_WATCH_WORKER_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: DARK_PROPOSAL_GATE_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_DARK_WATCH_WORKER_WORKFLOWS = [
  PND_DARK_HUNT_WORKFLOW,
  PND_DARK_CORRELATION_WORKFLOW,
  PND_DARK_PACKAGE_REPORT_WORKFLOW,
  PND_DARK_PROPOSAL_GATE_WORKFLOW,
] as const;

export const PND_DARK_WATCH_WORKER_WORKFLOW_IDS = [
  PND_DARK_HUNT_WORKFLOW_ID,
  PND_DARK_CORRELATION_WORKFLOW_ID,
  PND_DARK_PACKAGE_REPORT_WORKFLOW_ID,
  PND_DARK_PROPOSAL_GATE_WORKFLOW_ID,
] as const;
