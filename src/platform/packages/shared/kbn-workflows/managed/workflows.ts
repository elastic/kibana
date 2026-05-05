/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from './types';

export const WORKFLOWS_MANAGEMENT_HEALTH_CHECK_WORKFLOW_ID =
  'system-workflows-management-health-check';

export const WORKFLOWS_MANAGEMENT_HEALTH_CHECK_WORKFLOW: ManagedWorkflowDefinition = {
  id: WORKFLOWS_MANAGEMENT_HEALTH_CHECK_WORKFLOW_ID,
  pluginId: 'workflowsManagement',
  yaml: `name: Workflows Management Health Check
enabled: true
triggers:
  - type: scheduled
    with:
      every: 21m
steps:
  - name: echo
    type: console
    with:
      message: 'Workflows Management Health Check'
`,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
};

export const ENTITY_MONITOR_WORKFLOW_ID = 'system-entity-monitor';

export interface EntityMonitorWorkflowTemplateValues {
  entityId: string;
}

export const ENTITY_MONITOR_WORKFLOW_EXAMPLE: ManagedWorkflowDefinition = {
  id: ENTITY_MONITOR_WORKFLOW_ID,
  pluginId: 'workflowsManagement',
  yamlTemplate: ({ entityId }) => `name: Entity Monitor - ${entityId}
enabled: true
triggers:
  - type: scheduled
    with:
      every: 52m
steps:
  - name: check_entity
    type: console
    with:
      message: "Checking entity: ${entityId}"
`,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
};
