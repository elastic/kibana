/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowRunAsMode } from '../../spec/schema';
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
  serviceAccountId?: string;
  childWorkflowId?: string;
  runAsMode?: WorkflowRunAsMode;
  asynchronous?: boolean;
  waitForInput?: boolean;
  fallbackChild?: boolean;
  message?: string;
}

export const EXAMPLE_SERVICE_ACCOUNT_WORKFLOW = {
  id: EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID,
  pluginId: 'workflowsExtensionsExample',
  version: 2,
  billable: false,
  yamlTemplate: (values) => {
    const childCall = values.childWorkflowId
      ? `  - name: child
    type: ${values.asynchronous ? 'workflow.executeAsync' : 'workflow.execute'}
    with:
      workflow-id: ${JSON.stringify(values.childWorkflowId)}
${values.runAsMode !== undefined ? `      run-as-mode: ${values.runAsMode}\n` : ''}`
      : '';
    const settings = [
      values.serviceAccountId ? `  run_as: ${JSON.stringify(values.serviceAccountId)}\n` : '',
      values.fallbackChild && childCall
        ? `  on-failure:\n    fallback:\n${childCall
            .split('\n')
            .filter(Boolean)
            .map((line) => `    ${line}`)
            .join('\n')}\n`
        : '',
    ].join('');
    return `name: Managed ${values.childWorkflowId ? 'parent' : 'child'} identity example
description: ${JSON.stringify(
      values.message ?? 'Proves the effective identity of a managed parent or child workflow.'
    )}
enabled: true
${settings ? `settings:\n${settings}` : ''}triggers:
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
  values.fallbackChild
    ? `  - name: fail
    type: elasticsearch.request
    with:
      method: GET
      path: /_managed_child_inheritance_missing_endpoint
`
    : childCall
}  - name: message
    type: console
    with:
      message: ${JSON.stringify(values.message ?? 'Managed identity example completed')}
`;
  },
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<ServiceAccountWorkflowTemplateValues>;
