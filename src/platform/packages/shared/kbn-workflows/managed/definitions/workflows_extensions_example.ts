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

export const EXAMPLE_INHERITED_SERVICE_ACCOUNT_WORKFLOW_ID =
  'system-example-inherited-service-account';

export interface InheritedServiceAccountTemplateValues extends ManagedWorkflowTemplateValues {
  serviceAccountId?: string;
  childWorkflowId?: string;
  runAsMode?: 'default' | 'inherit' | 'override';
  inheritRunAs?: boolean;
  asynchronous?: boolean;
  waitForInput?: boolean;
  message?: string;
}

export const EXAMPLE_INHERITED_SERVICE_ACCOUNT_WORKFLOW = {
  id: EXAMPLE_INHERITED_SERVICE_ACCOUNT_WORKFLOW_ID,
  pluginId: 'workflowsExtensionsExample',
  version: 1,
  billable: false,
  yamlTemplate: (values) => `name: Managed ${
    values.childWorkflowId ? 'parent' : 'child'
  } identity example
description: ${JSON.stringify(
    values.message ?? 'Proves the effective identity of a managed parent or child workflow.'
  )}
enabled: true
${
  values.serviceAccountId ? `settings:\n  run_as: ${JSON.stringify(values.serviceAccountId)}\n` : ''
}triggers:
  - type: manual
steps:
${
  values.waitForInput
    ? `  - name: approval
    type: waitForInput
    with:
      message: Resume the managed child
      schema:
        type: object
        properties:
          approved:
            type: boolean
`
    : ''
}  - name: authenticate
    type: elasticsearch.request
    with:
      method: GET
      path: /_security/_authenticate
${
  values.childWorkflowId
    ? `  - name: child
    type: ${values.asynchronous ? 'workflow.executeAsync' : 'workflow.execute'}
    with:
      workflow-id: ${JSON.stringify(values.childWorkflowId)}
${values.runAsMode !== undefined ? `      runAsMode: ${values.runAsMode}\n` : ''}${
        values.inheritRunAs !== undefined ? `      inheritRunAs: ${values.inheritRunAs}\n` : ''
      }`
    : ''
}  - name: message
    type: console
    with:
      message: ${JSON.stringify(values.message ?? 'Managed identity example completed')}
`,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<InheritedServiceAccountTemplateValues>;
