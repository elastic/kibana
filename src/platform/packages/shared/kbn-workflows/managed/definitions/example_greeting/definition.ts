/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { yamlTemplate } from './latest';
import type { ExampleManagedWorkflowTemplateValues } from './types';
import type { ManagedWorkflowDefinition } from '../../types';

export const EXAMPLE_MANAGED_WORKFLOW_ID = 'system-example-greeting';

export type { ExampleManagedWorkflowTemplateValues } from './types';

export const EXAMPLE_MANAGED_WORKFLOW = {
  id: EXAMPLE_MANAGED_WORKFLOW_ID,
  pluginId: 'workflowsExtensionsExample',
  yamlTemplate,
  version: 1,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<ExampleManagedWorkflowTemplateValues>;
