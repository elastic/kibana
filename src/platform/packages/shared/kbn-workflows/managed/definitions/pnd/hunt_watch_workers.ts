/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PND_MANAGED_WORKFLOW_PLUGIN_ID, PND_RULE_WORKFLOW_MANAGEMENT } from './constants';
import CORRELATION_YAML from './hunt_correlation.yaml';
import HUNT_YAML from './hunt_execute.yaml';
import PACKAGE_REPORT_YAML from './hunt_package_report.yaml';
import PROPOSAL_GATE_YAML from './hunt_proposal_gate.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

// Hunt Watch child workflows: static yaml, untagged domain composition under
// continuous_threat_hunt (or, for hunt_proposal_gate, started server-side by
// start_proposal_gates). No Watch tags: they are not catalog members. Installed
// globally, once, alongside the rule workflows — not per-space like the tagged
// Worker that invokes them.

export const PND_HUNT_EXECUTE_WORKFLOW_ID = 'system-security-hunt-execute';
export const PND_HUNT_CORRELATION_WORKFLOW_ID = 'system-security-hunt-correlation';
export const PND_HUNT_PACKAGE_REPORT_WORKFLOW_ID = 'system-security-hunt-package-report';
export const PND_HUNT_PROPOSAL_GATE_WORKFLOW_ID = 'system-security-hunt-proposal-gate';

export const PND_HUNT_EXECUTE_WORKFLOW = {
  billable: false,
  id: PND_HUNT_EXECUTE_WORKFLOW_ID,
  management: PND_RULE_WORKFLOW_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: HUNT_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_HUNT_CORRELATION_WORKFLOW = {
  billable: false,
  id: PND_HUNT_CORRELATION_WORKFLOW_ID,
  management: PND_RULE_WORKFLOW_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: CORRELATION_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_HUNT_PACKAGE_REPORT_WORKFLOW = {
  billable: false,
  id: PND_HUNT_PACKAGE_REPORT_WORKFLOW_ID,
  management: PND_RULE_WORKFLOW_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: PACKAGE_REPORT_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_HUNT_PROPOSAL_GATE_WORKFLOW = {
  billable: false,
  id: PND_HUNT_PROPOSAL_GATE_WORKFLOW_ID,
  management: PND_RULE_WORKFLOW_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: PROPOSAL_GATE_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_HUNT_WATCH_WORKER_WORKFLOWS = [
  PND_HUNT_EXECUTE_WORKFLOW,
  PND_HUNT_CORRELATION_WORKFLOW,
  PND_HUNT_PACKAGE_REPORT_WORKFLOW,
  PND_HUNT_PROPOSAL_GATE_WORKFLOW,
] as const;

export const PND_HUNT_WATCH_WORKER_WORKFLOW_IDS = [
  PND_HUNT_EXECUTE_WORKFLOW_ID,
  PND_HUNT_CORRELATION_WORKFLOW_ID,
  PND_HUNT_PACKAGE_REPORT_WORKFLOW_ID,
  PND_HUNT_PROPOSAL_GATE_WORKFLOW_ID,
] as const;
