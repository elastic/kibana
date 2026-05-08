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

// ─── Workflows Management Built-in Workflows ─────────────────────────────────

export const WORKFLOWS_MANAGEMENT_HEALTH_CHECK_WORKFLOW_ID = 'system-workflow-health-check';

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
