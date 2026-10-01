/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../types';

export const EXAMPLE_MANAGED_WORKFLOW_ID = 'system-example-greeting';

export interface ExampleManagedWorkflowTemplateValues extends ManagedWorkflowTemplateValues {
  recipient: string;
}

export const EXAMPLE_MANAGED_WORKFLOW = {
  id: EXAMPLE_MANAGED_WORKFLOW_ID,
  pluginId: 'workflowsExtensionsExample',
  version: 2,
  billable: false,
  visibility: {
    selectors: ['rule_action'],
  },
  yamlTemplate: ({ recipient }) => `name: Example Greeting - ${recipient}
enabled: true
triggers:
  - type: workflows.failed
    on:
      # Filter the subscription by using KQL, use event.* to target event properties
      condition: not event.workflow.isErrorHandler:true
steps:
  - name: greet
    type: console
    with:
      message: "Hello, ${recipient}! This is a managed workflow example."
`,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<ExampleManagedWorkflowTemplateValues>;

export const EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID = 'system-example-service-account';

export interface ServiceAccountWorkflowTemplateValues extends ManagedWorkflowTemplateValues {
  serviceAccountId: string;
}

export const EXAMPLE_SERVICE_ACCOUNT_WORKFLOW = {
  id: EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID,
  pluginId: 'workflowsExtensionsExample',
  version: 1,
  billable: false,
  yamlTemplate: ({ serviceAccountId }) => `name: Managed service account identity proof
enabled: true
settings:
  run_as: ${JSON.stringify(serviceAccountId)}
triggers:
  - type: manual
steps:
  - name: authenticate
    type: elasticsearch.request
    with:
      method: GET
      path: /_security/_authenticate
`,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<ServiceAccountWorkflowTemplateValues>;
