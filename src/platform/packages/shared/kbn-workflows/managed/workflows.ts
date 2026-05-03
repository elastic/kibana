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
  - type: manual
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
    defaultEnabled: true,
  },
};
