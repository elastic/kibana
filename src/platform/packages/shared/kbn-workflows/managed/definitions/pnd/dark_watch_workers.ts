/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PND_MANAGED_WORKFLOW_PLUGIN_ID, PND_WATCH_WORKER_MANAGEMENT } from './constants';
import CONTINUOUS_THREAT_HUNT_YAML from './continuous_threat_hunt.yaml';
import CORRELATION_YAML from './correlation.yaml';
import COVERAGE_GAP_YAML from './coverage_gap.yaml';
import DARK_PROPOSAL_GATE_YAML from './dark_proposal_gate.yaml';
import PACKAGE_REPORT_YAML from './package_report.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

// Dark Watch Workers — static yaml, invoked by the Orchestrator (or, for
// dark_proposal_gate, started server-side by start_proposal_gates). No
// visibility: they are not Watch-catalog surfaces.

export const PND_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID =
  'system-security-dark-continuous-threat-hunt';
export const PND_DARK_COVERAGE_GAP_WORKFLOW_ID = 'system-security-dark-coverage-gap';
export const PND_DARK_CORRELATION_WORKFLOW_ID = 'system-security-dark-correlation';
export const PND_DARK_PACKAGE_REPORT_WORKFLOW_ID = 'system-security-dark-package-report';
export const PND_DARK_PROPOSAL_GATE_WORKFLOW_ID = 'system-security-dark-proposal-gate';

export const PND_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW = {
  billable: false,
  id: PND_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
  management: PND_WATCH_WORKER_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: CONTINUOUS_THREAT_HUNT_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_DARK_COVERAGE_GAP_WORKFLOW = {
  billable: false,
  id: PND_DARK_COVERAGE_GAP_WORKFLOW_ID,
  management: PND_WATCH_WORKER_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: COVERAGE_GAP_YAML,
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
  PND_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW,
  PND_DARK_COVERAGE_GAP_WORKFLOW,
  PND_DARK_CORRELATION_WORKFLOW,
  PND_DARK_PACKAGE_REPORT_WORKFLOW,
  PND_DARK_PROPOSAL_GATE_WORKFLOW,
] as const;

export const PND_DARK_WATCH_WORKER_WORKFLOW_IDS = [
  PND_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
  PND_DARK_COVERAGE_GAP_WORKFLOW_ID,
  PND_DARK_CORRELATION_WORKFLOW_ID,
  PND_DARK_PACKAGE_REPORT_WORKFLOW_ID,
  PND_DARK_PROPOSAL_GATE_WORKFLOW_ID,
] as const;
