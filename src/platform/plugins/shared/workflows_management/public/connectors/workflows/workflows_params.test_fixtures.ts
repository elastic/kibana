/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowListDto, WorkflowListItemDto, WorkflowYaml } from '@kbn/workflows';

const MINIMAL_WAIT_STEP = {
  name: 'minimal-wait',
  type: 'wait' as const,
  with: { duration: '1s' },
};

/** Minimal valid `WorkflowYaml` for connector UI tests; override fields as needed. */
export function createDefaultWorkflowYaml(overrides: Partial<WorkflowYaml> = {}): WorkflowYaml {
  return {
    version: '1',
    name: 'Test Workflow Definition',
    enabled: true,
    triggers: [{ type: 'manual' }],
    steps: [MINIMAL_WAIT_STEP],
    ...overrides,
  } as WorkflowYaml;
}

export function createWorkflowListItem(
  overrides: Partial<WorkflowListItemDto> = {}
): WorkflowListItemDto {
  return {
    id: 'workflow-1',
    name: 'Test Workflow 1',
    description: 'Description for workflow 1',
    enabled: true,
    definition: createDefaultWorkflowYaml({ tags: ['test-tag'] }),
    createdAt: '2023-01-01T00:00:00.000Z',
    history: [],
    valid: true,
    ...overrides,
  };
}

export function createWorkflowListResponse(
  results: WorkflowListItemDto[],
  page = 1,
  size = 1000,
  total?: number
): WorkflowListDto {
  return {
    page,
    size,
    total: total ?? results.length,
    results,
  };
}
