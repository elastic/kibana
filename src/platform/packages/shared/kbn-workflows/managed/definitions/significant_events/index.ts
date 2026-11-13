/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../../types';
import { readManagedWorkflowYaml } from '../read_managed_workflow_yaml';
export {
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from './scheduled';

export const SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID = 'system-significant-events-detection';
export const SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID = 'system-significant-events-discovery';
export const SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID = 'system-significant-events-orchestrator';
export const SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID = 'system-significant-events-cleanup';

// lifecycle: 'static' — instances are declared at startup; orphans are cleaned up on restart.
// versionStrategy: 'auto' — version bumps are handled automatically on install.
// enablement: 'enforced' — always enabled, cannot be disabled by the user.
const SIGNIFICANT_EVENTS_WORKFLOW_MANAGEMENT = {
  lifecycle: 'static',
  versionStrategy: 'auto',
  enablement: 'enforced',
} as const;

const SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_MANAGEMENT = {
  lifecycle: 'dynamic',
  versionStrategy: 'auto',
  enablement: 'restorable',
} as const;

export const SIGNIFICANT_EVENTS_DETECTION_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 8,
  billable: false,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'significant_events/detection.yaml');
  },
  management: SIGNIFICANT_EVENTS_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;

export const SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 30,
  billable: false,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'significant_events/discovery.yaml');
  },
  management: SIGNIFICANT_EVENTS_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;

export const SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 4,
  billable: false,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'significant_events/orchestrator.yaml');
  },
  management: SIGNIFICANT_EVENTS_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;

export const SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'cleanup.yaml');
  },
  management: SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;
