/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { buildExecutionContext, resolveExecutionContextPath } from './build_execution_context';

describe('buildExecutionContext', () => {
  const mockExecution: WorkflowExecutionDto = {
    id: 'exec-123',
    spaceId: 'default',
    status: ExecutionStatus.COMPLETED,
    isTestRun: false,
    startedAt: '2024-01-01T00:00:00Z',
    finishedAt: '2024-01-01T00:01:00Z',
    workflowId: 'workflow-456',
    workflowName: 'Test Workflow',
    workflowDefinition: {
      name: 'Test Workflow',
      version: '1',
      enabled: true,
      triggers: [],
      steps: [],
      consts: {
        API_URL: 'https://api.example.com',
        TIMEOUT: 5000,
      },
    },
    stepExecutions: [],
    duration: 60000,
    yaml: '',
    context: {
      inputs: {
        userId: 'user-123',
        count: 10,
      },
      event: {
        type: 'manual',
      },
    },
  };

  it('should return null when execution is undefined', () => {
    const result = buildExecutionContext(undefined, []);
    expect(result).toBeNull();
  });

  it('should build context with basic execution data', () => {
    const result = buildExecutionContext(mockExecution, []);

    expect(result).toEqual(
      expect.objectContaining({
        execution: {
          id: 'exec-123',
          isTestRun: false,
          startedAt: expect.any(Date),
          url: '',
        },
        workflow: {
          id: 'workflow-456',
          name: 'Test Workflow',
          enabled: true,
          spaceId: 'default',
        },
        inputs: {
          userId: 'user-123',
          count: 10,
        },
        consts: {
          API_URL: 'https://api.example.com',
          TIMEOUT: 5000,
        },
        event: {
          type: 'manual',
        },
        steps: {},
      })
    );
  });

  it('should handle missing context gracefully', () => {
    const executionWithoutContext: WorkflowExecutionDto = {
      ...mockExecution,
      context: undefined,
    };

    const result = buildExecutionContext(executionWithoutContext, []);

    expect(result).toEqual(
      expect.objectContaining({
        inputs: {},
        steps: {},
      })
    );
    expect(result?.event).toBeUndefined();
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
        error: null,
      },
    ];

    const result = buildExecutionContext(mockExecution, stepExecutions);

    expect(result?.steps).toEqual({
      fetchData: {
        input: { url: 'https://api.example.com/data' },
        output: { data: ['item1', 'item2'], total: 2 },
        error: undefined,
      },
      processData: {
        output: { processed: true },
        error: null,
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
        error: 'Network error',
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
        error: null,
      },
    ];

    const result = buildExecutionContext(mockExecution, stepExecutions);

    // Should have the latest execution (retry 1) based on globalExecutionIndex
    expect(result?.steps.fetchData).toEqual({
      output: { data: ['item1'] },
      error: null,
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
          currentIndex: 2,
          totalItems: 3,
        },
      },
    ];

    const result = buildExecutionContext(mockExecution, stepExecutions);

    expect(result?.steps.foreachStep).toEqual({
      output: { results: [] },
      error: undefined,
      currentIndex: 2,
      totalItems: 3,
    });
  });
});

describe('resolveExecutionContextPath', () => {
  const mockContext = {
    execution: {
      id: 'exec-123',
      isTestRun: false,
      startedAt: new Date('2024-01-01T00:00:00Z'),
      url: '',
    },
    workflow: {
      id: 'workflow-456',
      name: 'Test Workflow',
      enabled: true,
      spaceId: 'default',
    },
    kibanaUrl: 'http://localhost:5601',
    inputs: {
      userId: 'user-123',
      count: 10,
      nested: {
        deep: {
          value: 'found',
        },
      },
    },
    consts: {
      API_URL: 'https://api.example.com',
    },
    now: new Date(),
    steps: {
      fetchData: {
        output: {
          data: ['item1', 'item2'],
          total: 2,
        },
        error: null,
      },
      processData: {
        output: { processed: true },
      },
    },
  };

  it('should return context when path is empty', () => {
    const result = resolveExecutionContextPath(mockContext, '');

    expect(result.exists).toBe(true);
    expect(result.type).toBe('object');
    expect(result.value).toBe(mockContext);
  });

  it('should return not available when context is null', () => {
    const result = resolveExecutionContextPath(null, 'inputs.userId');

    expect(result.exists).toBe(false);
    expect(result.type).toBe('undefined');
    expect(result.preview).toBe('No execution context available');
  });

  it('should resolve top-level property', () => {
    const result = resolveExecutionContextPath(mockContext, 'inputs');

    expect(result.exists).toBe(true);
    expect(result.type).toBe('object');
    expect(result.value).toEqual({
      userId: 'user-123',
      count: 10,
      nested: {
        deep: {
          value: 'found',
        },
      },
    });
  });

  it('should resolve nested property', () => {
    const result = resolveExecutionContextPath(mockContext, 'inputs.userId');

    expect(result.exists).toBe(true);
    expect(result.type).toBe('string');
    expect(result.value).toBe('user-123');
  });

  it('should resolve deeply nested property', () => {
    const result = resolveExecutionContextPath(mockContext, 'inputs.nested.deep.value');

    expect(result.exists).toBe(true);
    expect(result.type).toBe('string');
    expect(result.value).toBe('found');
  });

  it('should resolve steps property', () => {
    const result = resolveExecutionContextPath(mockContext, 'steps.fetchData.output.data');

    expect(result.exists).toBe(true);
    expect(result.type).toBe('array');
    expect(result.value).toEqual(['item1', 'item2']);
  });

  it('should handle non-existent path', () => {
    const result = resolveExecutionContextPath(mockContext, 'inputs.nonExistent');

    expect(result.exists).toBe(false);
    expect(result.type).toBe('undefined');
    expect(result.preview).toContain('Path not found');
  });

  it('should handle non-existent nested path', () => {
    const result = resolveExecutionContextPath(mockContext, 'steps.nonExistentStep.output');

    expect(result.exists).toBe(false);
    expect(result.type).toBe('undefined');
  });

  it('should handle array access notation', () => {
    const result = resolveExecutionContextPath(mockContext, 'steps.fetchData.output.data[0]');

    expect(result.exists).toBe(true);
    expect(result.type).toBe('string');
    expect(result.value).toBe('item1');
  });

  it('should handle number values', () => {
    const result = resolveExecutionContextPath(mockContext, 'inputs.count');

    expect(result.exists).toBe(true);
    expect(result.type).toBe('number');
    expect(result.value).toBe(10);
  });

  it('should truncate large values in preview', () => {
    const largeObject = {
      data: Array(1000)
        .fill(null)
        .map((_, i) => ({ id: i, value: `item-${i}` })),
    };

    const contextWithLargeData = {
      ...mockContext,
      steps: {
        ...mockContext.steps,
        largeData: {
          output: largeObject,
        },
      },
    };

    const result = resolveExecutionContextPath(contextWithLargeData, 'steps.largeData.output');

    expect(result.exists).toBe(true);
    expect(result.preview).toContain('... (truncated)');
  });

  it('should identify null values correctly', () => {
    const result = resolveExecutionContextPath(mockContext, 'steps.fetchData.error');

    expect(result.exists).toBe(true);
    expect(result.type).toBe('null');
    expect(result.value).toBe(null);
  });
});
