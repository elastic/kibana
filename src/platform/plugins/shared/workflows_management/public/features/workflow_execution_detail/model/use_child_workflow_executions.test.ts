/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { useChildWorkflowExecutions } from './use_child_workflow_executions';

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: jest.fn(),
}));
const mockUseWorkflowsApi = useWorkflowsApi as jest.MockedFunction<typeof useWorkflowsApi>;

jest.mock('@kbn/workflows', () => ({
  ...jest.requireActual('@kbn/workflows'),
  isExecuteSyncStepType: jest.fn(() => false),
  isTerminalStatus: jest.fn((status: string) =>
    ['completed', 'failed', 'skipped'].includes(status)
  ),
}));

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

const createMockExecution = (overrides?: Partial<WorkflowExecutionDto>): WorkflowExecutionDto => ({
  spaceId: 'default',
  id: 'exec-1',
  status: ExecutionStatus.COMPLETED,
  isTestRun: false,
  startedAt: '2024-01-15T10:30:00.000Z',
  finishedAt: '2024-01-15T10:31:00.000Z',
  error: null,
  workflowId: 'wf-1',
  workflowName: 'Test Workflow',
  workflowDefinition: { name: 'Test', steps: [] } as never,
  stepExecutions: [],
  duration: 60000,
  yaml: '',
  ...overrides,
});

describe('useChildWorkflowExecutions', () => {
  let mockGetChildrenExecutions: jest.Mock;
  let queryClient: QueryClient;

  const childExecutionResponse = [
    {
      parentStepExecutionId: 'step-exec-1',
      workflowId: 'child-wf-1',
      workflowName: 'Child Workflow',
      executionId: 'child-exec-1',
      status: ExecutionStatus.COMPLETED,
      stepExecutions: [],
    },
  ];

  beforeEach(() => {
    mockGetChildrenExecutions = jest.fn().mockResolvedValue(childExecutionResponse);
    mockUseWorkflowsApi.mockReturnValue({
      getChildrenExecutions: mockGetChildrenExecutions,
    } as any);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should not fetch when parentExecution is undefined', () => {
    const { result } = renderHook(() => useChildWorkflowExecutions(undefined), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.childExecutions.size).toBe(0);
    expect(mockGetChildrenExecutions).not.toHaveBeenCalled();
  });

  it('should not fetch when parentExecution is null', () => {
    const { result } = renderHook(() => useChildWorkflowExecutions(null), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.childExecutions.size).toBe(0);
    expect(mockGetChildrenExecutions).not.toHaveBeenCalled();
  });

  it('should fetch child executions when parentExecution is provided', async () => {
    const execution = createMockExecution();

    const { result } = renderHook(() => useChildWorkflowExecutions(execution), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.childExecutions.size).toBe(1);
    });

    expect(mockGetChildrenExecutions).toHaveBeenCalledWith('exec-1');
    expect(result.current.childExecutions.get('step-exec-1')).toEqual(
      expect.objectContaining({
        workflowId: 'child-wf-1',
        executionId: 'child-exec-1',
      })
    );
  });

  it('should return an empty map when API returns no results', async () => {
    mockGetChildrenExecutions.mockResolvedValue([]);
    const execution = createMockExecution();

    const { result } = renderHook(() => useChildWorkflowExecutions(execution), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.childExecutions.size).toBe(0);
  });

  it('should key child executions by parentStepExecutionId', async () => {
    mockGetChildrenExecutions.mockResolvedValue([
      {
        parentStepExecutionId: 'step-a',
        workflowId: 'wf-a',
        workflowName: 'Workflow A',
        executionId: 'exec-a',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [],
      },
      {
        parentStepExecutionId: 'step-b',
        workflowId: 'wf-b',
        workflowName: 'Workflow B',
        executionId: 'exec-b',
        status: ExecutionStatus.FAILED,
        stepExecutions: [],
      },
    ]);

    const execution = createMockExecution();

    const { result } = renderHook(() => useChildWorkflowExecutions(execution), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.childExecutions.size).toBe(2);
    });

    expect(result.current.childExecutions.has('step-a')).toBe(true);
    expect(result.current.childExecutions.has('step-b')).toBe(true);
  });
});
