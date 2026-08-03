/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import WATCH_DARK_YAML from './watch_dark.yaml';
import WATCH_DEEP_YAML from './watch_deep.yaml';
import WATCH_FLOOR_YAML from './watch_floor.yaml';
import WATCH_OFFICER_YAML from './watch_officer.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const PND_WATCH_FLOOR_WORKFLOW_ID = 'system-security-watch-floor';
export const PND_WATCH_OFFICER_WORKFLOW_ID = 'system-security-watch-officer';
export const PND_WATCH_DARK_WORKFLOW_ID = 'system-security-watch-dark';
export const PND_WATCH_DEEP_WORKFLOW_ID = 'system-security-watch-deep';

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

export const PND_WATCH_FLOOR_WORKFLOW = {
  billable: false,
  id: PND_WATCH_FLOOR_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 4,
  visibility: VISIBILITY,
  yaml: WATCH_FLOOR_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_OFFICER_WORKFLOW = {
  billable: false,
  id: PND_WATCH_OFFICER_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 5,
  visibility: VISIBILITY,
  yaml: WATCH_OFFICER_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_DARK_WORKFLOW = {
  billable: false,
  id: PND_WATCH_DARK_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 5,
  visibility: VISIBILITY,
  yaml: WATCH_DARK_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_DEEP_WORKFLOW = {
  billable: false,
  id: PND_WATCH_DEEP_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 4,
  visibility: VISIBILITY,
  yaml: WATCH_DEEP_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_WATCH_WORKFLOWS = [
  PND_WATCH_FLOOR_WORKFLOW,
  PND_WATCH_OFFICER_WORKFLOW,
  PND_WATCH_DARK_WORKFLOW,
  PND_WATCH_DEEP_WORKFLOW,
] as const;

export const PND_WATCH_WORKFLOW_IDS = [
  PND_WATCH_FLOOR_WORKFLOW_ID,
  PND_WATCH_OFFICER_WORKFLOW_ID,
  PND_WATCH_DARK_WORKFLOW_ID,
  PND_WATCH_DEEP_WORKFLOW_ID,
] as const;
