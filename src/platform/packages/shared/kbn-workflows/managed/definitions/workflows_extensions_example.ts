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
export const EXAMPLE_ENABLED_SCHEDULED_MANAGED_WORKFLOW_ID =
  'system-example-enabled-scheduled-greeting';

export interface ExampleManagedWorkflowTemplateValues extends ManagedWorkflowTemplateValues {
  recipient: string;
}

export const EXAMPLE_MANAGED_WORKFLOW = {
  id: EXAMPLE_MANAGED_WORKFLOW_ID,
  pluginId: 'workflowsExtensionsExample',
  version: 1,
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

export const EXAMPLE_ENABLED_SCHEDULED_MANAGED_WORKFLOW = {
  id: EXAMPLE_ENABLED_SCHEDULED_MANAGED_WORKFLOW_ID,
  pluginId: 'workflowsExtensionsExample',
  version: 1,
  yaml: `name: Example Enabled Scheduled Greeting
enabled: true
triggers:
  - type: scheduled
    with:
      every: 1m
steps:
  - name: greet
    type: console
    with:
      message: "executedBy: {{ execution.executedBy }}"
`,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition;
