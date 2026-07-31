/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// D10 topology: each Watch is realized by an Orchestrator (owns trigger, run-as,
// Investigation Conversation, HIL, escalation) that invokes a domain Worker via
// workflow.execute. The Orchestrators keep the canonical Watch ids so they are
// projected 1:1 as the Watches; the Workers carry -worker ids and are not shown
// as top-level Watches.
import WATCH_AD_CONTINUATION_ORCHESTRATOR_YAML from './watch_ad_continuation_orchestrator.yaml';
import WATCH_AD_CONTINUATION_WORKER_YAML from './watch_ad_continuation_worker.yaml';
import WATCH_DARK_CONTINUOUS_HUNT_WORKER_YAML from './watch_dark_continuous_hunt_worker.yaml';
import WATCH_DARK_ORCHESTRATOR_YAML from './watch_dark_orchestrator.yaml';
import WATCH_DARK_WORKER_YAML from './watch_dark_worker.yaml';
import WATCH_DEEP_ORCHESTRATOR_YAML from './watch_deep_orchestrator.yaml';
import WATCH_DEEP_WORKER_YAML from './watch_deep_worker.yaml';
import WATCH_DETECTION_ORCHESTRATOR_YAML from './watch_detection_orchestrator.yaml';
import WATCH_DETECTION_RULE_CREATION_WORKER_YAML from './watch_detection_rule_creation_worker.yaml';
import WATCH_DETECTION_RULE_TUNING_WORKER_YAML from './watch_detection_rule_tuning_worker.yaml';
import WATCH_FLOOR_ORCHESTRATOR_YAML from './watch_floor_orchestrator.yaml';
import WATCH_FLOOR_WORKER_YAML from './watch_floor_worker.yaml';
import WATCH_OFFICER_YAML from './watch_officer.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

// Orchestrators keep the canonical Watch ids (1:1 Watch projection).
export const PND_WATCH_FLOOR_WORKFLOW_ID = 'system-security-watch-floor';
export const PND_WATCH_OFFICER_WORKFLOW_ID = 'system-security-watch-officer';
export const PND_WATCH_DARK_WORKFLOW_ID = 'system-security-watch-dark';
export const PND_WATCH_DEEP_WORKFLOW_ID = 'system-security-watch-deep';
export const PND_WATCH_DETECTION_WORKFLOW_ID = 'system-security-watch-detection';
export const PND_WATCH_AD_CONTINUATION_WORKFLOW_ID = 'system-security-watch-ad';

// Workers (domain workflows invoked by the Orchestrators).
export const PND_WATCH_FLOOR_WORKER_WORKFLOW_ID = 'system-security-watch-floor-worker';
export const PND_WATCH_DARK_WORKER_WORKFLOW_ID = 'system-security-watch-dark-worker';
export const PND_WATCH_DARK_CONTINUOUS_HUNT_WORKER_WORKFLOW_ID =
  'system-security-watch-dark-continuous-hunt-worker';
export const PND_WATCH_DEEP_WORKER_WORKFLOW_ID = 'system-security-watch-deep-worker';
export const PND_WATCH_DETECTION_RULE_CREATION_WORKER_WORKFLOW_ID =
  'system-security-watch-detection-rule-creation-worker';
export const PND_WATCH_DETECTION_RULE_TUNING_WORKER_WORKFLOW_ID =
  'system-security-watch-detection-rule-tuning-worker';
export const PND_WATCH_AD_CONTINUATION_WORKER_WORKFLOW_ID =
  'system-security-watch-ad-continuation-worker';

const MANAGEMENT = {
  enablement: 'restorable',
  lifecycle: 'static',
  versionStrategy: 'auto',
} as const;

const PLUGIN_ID = 'pnd';

/** Discoverable in Watch catalog / WorkflowSelector surfaces that opt into `watch`. */
const VISIBILITY = {
  selectors: ['watch'],
  solutions: ['security'],
} as const;

/** Workers are invoked by Orchestrators; not surfaced as top-level Watches. */
const WORKER_VISIBILITY = {
  selectors: [],
  solutions: ['security'],
} as const;

export const PND_WATCH_FLOOR_WORKFLOW = {
  billable: false,
  id: PND_WATCH_FLOOR_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 5,
  visibility: VISIBILITY,
  yaml: WATCH_FLOOR_ORCHESTRATOR_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_FLOOR_WORKER_WORKFLOW = {
  billable: false,
  id: PND_WATCH_FLOOR_WORKER_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  visibility: WORKER_VISIBILITY,
  yaml: WATCH_FLOOR_WORKER_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_OFFICER_WORKFLOW = {
  billable: false,
  id: PND_WATCH_OFFICER_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 4,
  visibility: VISIBILITY,
  yaml: WATCH_OFFICER_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_DARK_WORKFLOW = {
  billable: false,
  id: PND_WATCH_DARK_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 6,
  visibility: VISIBILITY,
  yaml: WATCH_DARK_ORCHESTRATOR_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_DARK_WORKER_WORKFLOW = {
  billable: false,
  id: PND_WATCH_DARK_WORKER_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  visibility: WORKER_VISIBILITY,
  yaml: WATCH_DARK_WORKER_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_DARK_CONTINUOUS_HUNT_WORKER_WORKFLOW = {
  billable: false,
  id: PND_WATCH_DARK_CONTINUOUS_HUNT_WORKER_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  visibility: WORKER_VISIBILITY,
  yaml: WATCH_DARK_CONTINUOUS_HUNT_WORKER_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_DEEP_WORKFLOW = {
  billable: false,
  id: PND_WATCH_DEEP_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 5,
  visibility: VISIBILITY,
  yaml: WATCH_DEEP_ORCHESTRATOR_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_DEEP_WORKER_WORKFLOW = {
  billable: false,
  id: PND_WATCH_DEEP_WORKER_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  visibility: WORKER_VISIBILITY,
  yaml: WATCH_DEEP_WORKER_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_DETECTION_WORKFLOW = {
  billable: false,
  id: PND_WATCH_DETECTION_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  visibility: VISIBILITY,
  yaml: WATCH_DETECTION_ORCHESTRATOR_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_DETECTION_RULE_CREATION_WORKER_WORKFLOW = {
  billable: false,
  id: PND_WATCH_DETECTION_RULE_CREATION_WORKER_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  visibility: WORKER_VISIBILITY,
  yaml: WATCH_DETECTION_RULE_CREATION_WORKER_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_DETECTION_RULE_TUNING_WORKER_WORKFLOW = {
  billable: false,
  id: PND_WATCH_DETECTION_RULE_TUNING_WORKER_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  visibility: WORKER_VISIBILITY,
  yaml: WATCH_DETECTION_RULE_TUNING_WORKER_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_AD_CONTINUATION_WORKFLOW = {
  billable: false,
  id: PND_WATCH_AD_CONTINUATION_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  visibility: VISIBILITY,
  yaml: WATCH_AD_CONTINUATION_ORCHESTRATOR_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_AD_CONTINUATION_WORKER_WORKFLOW = {
  billable: false,
  id: PND_WATCH_AD_CONTINUATION_WORKER_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  visibility: WORKER_VISIBILITY,
  yaml: WATCH_AD_CONTINUATION_WORKER_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_WORKFLOWS = [
  PND_WATCH_FLOOR_WORKFLOW,
  PND_WATCH_FLOOR_WORKER_WORKFLOW,
  PND_WATCH_OFFICER_WORKFLOW,
  PND_WATCH_DARK_WORKFLOW,
  PND_WATCH_DARK_WORKER_WORKFLOW,
  PND_WATCH_DARK_CONTINUOUS_HUNT_WORKER_WORKFLOW,
  PND_WATCH_DEEP_WORKFLOW,
  PND_WATCH_DEEP_WORKER_WORKFLOW,
  PND_WATCH_DETECTION_WORKFLOW,
  PND_WATCH_DETECTION_RULE_CREATION_WORKER_WORKFLOW,
  PND_WATCH_DETECTION_RULE_TUNING_WORKER_WORKFLOW,
  PND_WATCH_AD_CONTINUATION_WORKFLOW,
  PND_WATCH_AD_CONTINUATION_WORKER_WORKFLOW,
] as const;

export const PND_WATCH_WORKFLOW_IDS = [
  PND_WATCH_FLOOR_WORKFLOW_ID,
  PND_WATCH_FLOOR_WORKER_WORKFLOW_ID,
  PND_WATCH_OFFICER_WORKFLOW_ID,
  PND_WATCH_DARK_WORKFLOW_ID,
  PND_WATCH_DARK_WORKER_WORKFLOW_ID,
  PND_WATCH_DARK_CONTINUOUS_HUNT_WORKER_WORKFLOW_ID,
  PND_WATCH_DEEP_WORKFLOW_ID,
  PND_WATCH_DEEP_WORKER_WORKFLOW_ID,
  PND_WATCH_DETECTION_WORKFLOW_ID,
  PND_WATCH_DETECTION_RULE_CREATION_WORKER_WORKFLOW_ID,
  PND_WATCH_DETECTION_RULE_TUNING_WORKER_WORKFLOW_ID,
  PND_WATCH_AD_CONTINUATION_WORKFLOW_ID,
  PND_WATCH_AD_CONTINUATION_WORKER_WORKFLOW_ID,
] as const;
