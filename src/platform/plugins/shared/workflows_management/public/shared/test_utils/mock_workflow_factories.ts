/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ExecutionStatus,
  type WorkflowExecutionDto,
  type WorkflowExecutionListDto,
  type WorkflowExecutionListItemDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows/types/v1';

export const createMockStepExecutionDto = (
  overrides: Partial<WorkflowStepExecutionDto> = {}
): WorkflowStepExecutionDto => ({
  id: 'doc-1',
  stepId: 'step-1',
  stepType: 'action',
  scopeStack: [],
  workflowRunId: 'run-1',
  workflowId: 'wf-1',
  status: ExecutionStatus.COMPLETED,
  startedAt: '2024-01-01T00:00:00Z',
  topologicalIndex: 0,
  globalExecutionIndex: 0,
  stepExecutionIndex: 0,
  ...overrides,
});

export const createMockExecutionListItemDto = (
  overrides: Partial<WorkflowExecutionListItemDto> = {}
): WorkflowExecutionListItemDto => ({
  spaceId: 'default',
  id: 'exec-1',
  status: ExecutionStatus.COMPLETED,
  isTestRun: false,
  startedAt: '2024-01-01T00:00:00Z',
  finishedAt: '2024-01-01T00:01:00Z',
  error: null,
  duration: 60000,
  ...overrides,
});

export const createMockWorkflowExecutionDto = (
  overrides: Partial<WorkflowExecutionDto> = {}
): WorkflowExecutionDto => ({
  spaceId: 'default',
  id: 'exec-1',
  status: ExecutionStatus.COMPLETED,
  isTestRun: false,
  startedAt: '2024-01-01T00:00:00Z',
  finishedAt: '2024-01-01T00:01:00Z',
  error: null,
  workflowId: 'wf-1',
  workflowName: 'Test Workflow',
  workflowDefinition: { version: '1', name: 'Test Workflow', enabled: true, triggers: [], steps: [] },
  stepExecutions: [],
  duration: 60000,
  yaml: 'triggers:\n  - type: manual\nsteps: []',
  ...overrides,
});

export const createMockWorkflowExecutionListDto = (
  overrides: Partial<WorkflowExecutionListDto> = {}
): WorkflowExecutionListDto => ({
  results: [createMockExecutionListItemDto()],
  page: 1,
  size: 100,
  total: 1,
  ...overrides,
});
