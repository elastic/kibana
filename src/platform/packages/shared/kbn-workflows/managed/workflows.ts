/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import STREAMS_KI_FEATURES_IDENTIFICATION_YAML from './streams_ki_features_identification.yaml';
import STREAMS_KI_ONBOARDING_YAML from './streams_ki_onboarding.yaml';
import STREAMS_KI_QUERIES_GENERATION_YAML from './streams_ki_queries_generation.yaml';
import type { ManagedWorkflowDefinition } from './types';

// ─── Streams KI Workflows ────────────────────────────────────────────────────

export const STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID =
  'system-streams-ki-features-identification';

export const STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW: ManagedWorkflowDefinition = {
  id: STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  pluginId: 'streams',
  yaml: STREAMS_KI_FEATURES_IDENTIFICATION_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
};

export const STREAMS_KI_QUERIES_GENERATION_WORKFLOW_ID = 'system-streams-ki-queries-generation';

export const STREAMS_KI_QUERIES_GENERATION_WORKFLOW: ManagedWorkflowDefinition = {
  id: STREAMS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  pluginId: 'streams',
  yaml: STREAMS_KI_QUERIES_GENERATION_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
};

export const STREAMS_KI_ONBOARDING_WORKFLOW_ID = 'system-streams-ki-onboarding';

export const STREAMS_KI_ONBOARDING_WORKFLOW: ManagedWorkflowDefinition = {
  id: STREAMS_KI_ONBOARDING_WORKFLOW_ID,
  pluginId: 'streams',
  yaml: STREAMS_KI_ONBOARDING_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
};

export const EXAMPLE_MANAGED_WORKFLOW_ID = 'system-example-greeting';

export interface ExampleManagedWorkflowTemplateValues {
  recipient: string;
}

export const EXAMPLE_MANAGED_WORKFLOW = {
  id: EXAMPLE_MANAGED_WORKFLOW_ID,
  pluginId: 'workflowsExtensionsExample',
  yamlTemplate: ({ recipient }) => `name: Example Greeting - ${recipient}
enabled: true
triggers:
  - type: manual
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
