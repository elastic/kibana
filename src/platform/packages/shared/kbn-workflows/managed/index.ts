/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ManagedWorkflowDefinition,
  ManagedWorkflowManagement,
  ManagedWorkflowTemplateValues,
  ResolvedManagedWorkflowDefinition,
} from './types';
import {
  ENTITY_MONITOR_WORKFLOW_EXAMPLE,
  ENTITY_MONITOR_WORKFLOW_ID,
  STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW,
  STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  STREAMS_KI_ONBOARDING_WORKFLOW,
  STREAMS_KI_ONBOARDING_WORKFLOW_ID,
  STREAMS_KI_QUERIES_GENERATION_WORKFLOW,
  STREAMS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  WORKFLOWS_MANAGEMENT_HEALTH_CHECK_WORKFLOW,
  WORKFLOWS_MANAGEMENT_HEALTH_CHECK_WORKFLOW_ID,
} from './workflows';

export type {
  ManagedWorkflowDefinition,
  ManagedWorkflowManagement,
  ManagedWorkflowTemplateValues,
  ResolvedManagedWorkflowDefinition,
};

const defaultManagementPolicy: Required<ManagedWorkflowManagement> = {
  lifecycle: 'static',
  versionStrategy: 'auto',
  enablement: 'restorable',
};

export const managedWorkflowDefinitions = [
  WORKFLOWS_MANAGEMENT_HEALTH_CHECK_WORKFLOW,
  ENTITY_MONITOR_WORKFLOW_EXAMPLE,
  STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW,
  STREAMS_KI_QUERIES_GENERATION_WORKFLOW,
  STREAMS_KI_ONBOARDING_WORKFLOW,
] as const;

export type ManagedWorkflowId = (typeof managedWorkflowDefinitions)[number]['id'];

export const getManagedWorkflowDefinition = (
  id: string
): ResolvedManagedWorkflowDefinition | undefined => {
  const workflow = managedWorkflowDefinitions.find((definition) => definition.id === id);
  if (!workflow) {
    return undefined;
  }

  return {
    ...workflow,
    management: {
      ...defaultManagementPolicy,
      ...workflow.management,
    },
  };
};

export const getManagedWorkflowDefinitions = (): ResolvedManagedWorkflowDefinition[] => {
  return managedWorkflowDefinitions.map((workflow) => ({
    ...workflow,
    management: {
      ...defaultManagementPolicy,
      ...workflow.management,
    },
  }));
};

export {
  WORKFLOWS_MANAGEMENT_HEALTH_CHECK_WORKFLOW_ID,
  ENTITY_MONITOR_WORKFLOW_ID,
  STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  STREAMS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  STREAMS_KI_ONBOARDING_WORKFLOW_ID,
};
