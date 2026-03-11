/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { buildExecutionContext } from './build_execution_context';

describe('buildExecutionContext', () => {
  const mockExecutionContext = {
    inputs: {
      userId: 'user-123',
      count: 10,
    },
    event: {
      type: 'manual',
    },
  };

  it('should return null when stepExecutions is undefined', () => {
    const result = buildExecutionContext(undefined, mockExecutionContext);
    expect(result).toBeNull();
  });

  it('should return null when stepExecutions is empty', () => {
    const result = buildExecutionContext([], mockExecutionContext);
    expect(result).toBeNull();
  });

  it('should build steps map from stepExecutions', () => {
    const stepExecutions: WorkflowStepExecutionDto[] = [
      {
        id: 'step-exec-1',
        stepId: 'fetchData',
        stepType: 'http',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2024-01-01T00:00:01Z',
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
        topologicalIndex: 0,
        scopeStack: [],
        workflowRunId: 'exec-123',
        workflowId: 'workflow-456',
        input: { url: 'https://api.example.com/data' },
        output: { data: ['item1', 'item2'], total: 2 },
      },
      {
        id: 'step-exec-2',
        stepId: 'processData',
        stepType: 'console',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2024-01-01T00:00:02Z',
        globalExecutionIndex: 1,
        stepExecutionIndex: 0,
        topologicalIndex: 1,
        scopeStack: [],
        workflowRunId: 'exec-123',
        workflowId: 'workflow-456',
        output: { processed: true },
      },
    ];

    const result = buildExecutionContext(stepExecutions, mockExecutionContext);

    expect(result?.steps).toEqual({
      fetchData: {
        input: { url: 'https://api.example.com/data' },
        output: { data: ['item1', 'item2'], total: 2 },
        error: undefined,
        status: ExecutionStatus.COMPLETED,
        state: undefined,
      },
      processData: {
        input: undefined,
        output: { processed: true },
        error: undefined,
        status: ExecutionStatus.COMPLETED,
        state: undefined,
      },
    });
  });

  it('should keep only the latest execution per stepId', () => {
    const stepExecutions: WorkflowStepExecutionDto[] = [
      {
        id: 'step-exec-1-retry-0',
        stepId: 'fetchData',
        stepType: 'http',
        status: ExecutionStatus.FAILED,
        startedAt: '2024-01-01T00:00:01Z',
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
        topologicalIndex: 0,
        scopeStack: [],
        workflowRunId: 'exec-123',
        workflowId: 'workflow-456',
        output: null,
        error: { type: 'NetworkError', message: 'Network error' },
      },
      {
        id: 'step-exec-1-retry-1',
        stepId: 'fetchData',
        stepType: 'http',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2024-01-01T00:00:05Z',
        globalExecutionIndex: 1,
        stepExecutionIndex: 1,
        topologicalIndex: 0,
        scopeStack: [],
        workflowRunId: 'exec-123',
        workflowId: 'workflow-456',
        output: { data: ['item1'] },
      },
    ];

    const result = buildExecutionContext(stepExecutions, mockExecutionContext);

    // Should have the latest execution (retry 1) based on globalExecutionIndex
    expect(result?.steps.fetchData).toEqual({
      input: undefined,
      output: { data: ['item1'] },
      error: undefined,
      status: ExecutionStatus.COMPLETED,
      state: undefined,
    });
  });

  it('should include step state if present', () => {
    const stepExecutions: WorkflowStepExecutionDto[] = [
      {
        id: 'step-exec-1',
        stepId: 'foreachStep',
        stepType: 'foreach',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2024-01-01T00:00:01Z',
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
        topologicalIndex: 0,
        scopeStack: [],
        workflowRunId: 'exec-123',
        workflowId: 'workflow-456',
        output: { results: [] },
        state: {
          items: [{ id: 1 }, { id: 2 }, { id: 3 }],
          currentIndex: 2,
          totalItems: 3,
        },
      },
    ];

    const result = buildExecutionContext(stepExecutions, mockExecutionContext);

    expect(result?.steps.foreachStep).toEqual({
      output: { results: [] },
      error: undefined,
      status: ExecutionStatus.COMPLETED,
      state: {
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
        currentIndex: 2,
        totalItems: 3,
      },
    });
  });
});
