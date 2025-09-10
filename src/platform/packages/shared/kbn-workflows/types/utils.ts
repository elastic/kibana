/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '../spec/schema';
import { type EsWorkflow, ExecutionStatus } from './v1';

export function transformWorkflowYamlJsontoEsWorkflow(
  workflowDefinition: WorkflowYaml
): Omit<
  EsWorkflow,
  'spaceId' | 'id' | 'createdAt' | 'createdBy' | 'lastUpdatedAt' | 'lastUpdatedBy' | 'yaml'
> {
  // TODO: handle merge, if, foreach, etc.

  return {
    name: workflowDefinition.name,
    description: workflowDefinition.description,
    tags: workflowDefinition.tags ?? [],
    enabled: workflowDefinition.enabled,
    definition: workflowDefinition,
    deleted_at: null,
    valid: true,
  };
}

export function isDangerousStatus(status: ExecutionStatus) {
  return status === ExecutionStatus.FAILED || status === ExecutionStatus.CANCELLED;
}
