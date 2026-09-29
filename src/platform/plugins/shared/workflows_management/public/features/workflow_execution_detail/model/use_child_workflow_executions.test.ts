/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus, isExecuteSyncStepType } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { useChildWorkflowExecutions } from './use_child_workflow_executions';
import { CHILD_WORKFLOW_EXECUTIONS_POLL_INTERVAL_MS } from '../../../hooks/polling_constants';

vi.mock('@kbn/workflows-ui', () => {
  const mocked = {
    useWorkflowsApi: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
const mockUseWorkflowsApi = useWorkflowsApi as MockedFunction<typeof useWorkflowsApi>;
const mockIsExecuteSyncStepType = isExecuteSyncStepType as MockedFunction<
  typeof isExecuteSyncStepType
>;

vi.mock('@kbn/workflows', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/workflows')),
    isExecuteSyncStepType: vi.fn(() => false),
    isTerminalStatus: vi.fn((status: string) =>
      ['completed', 'failed', 'skipped'].includes(status)
    ),
  };
  return { ...mocked, default: mocked };
});

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
  let mockGetChildrenExecutions: Mock;
  let queryClient: QueryClient;

  const executeStep = (id: string, status: ExecutionStatus) =>
    ({ id, stepType: 'workflow.execute', status } as never);

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
    mockGetChildrenExecutions = vi.fn().mockResolvedValue(childExecutionResponse);
    mockUseWorkflowsApi.mockReturnValue({
      getChildrenExecutions: mockGetChildrenExecutions,
    } as any);
    mockIsExecuteSyncStepType.mockReturnValue(false);
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

  it('keeps resolved children while a child step status changes the query key', async () => {
    mockIsExecuteSyncStepType.mockReturnValue(true);
    const { result, rerender } = renderHook(
      ({ execution }: { execution: WorkflowExecutionDto }) => useChildWorkflowExecutions(execution),
      {
        initialProps: {
          execution: createMockExecution({
            status: ExecutionStatus.RUNNING,
            stepExecutions: [executeStep('step-exec-1', ExecutionStatus.COMPLETED)],
          }),
        },
        wrapper: createWrapper(queryClient),
      }
    );

    await waitFor(() => expect(result.current.childExecutions.size).toBe(1));

    let resolveSecondFetch: (items: unknown[]) => void = () => {};
    mockGetChildrenExecutions.mockReturnValue(
      new Promise((resolve) => {
        resolveSecondFetch = resolve;
      })
    );

    rerender({
      execution: createMockExecution({
        status: ExecutionStatus.RUNNING,
        stepExecutions: [
          executeStep('step-exec-1', ExecutionStatus.COMPLETED),
          executeStep('step-exec-2', ExecutionStatus.COMPLETED),
        ],
      }),
    });

    expect(result.current.childExecutions.get('step-exec-1')).toBeDefined();

    await act(async () => {
      resolveSecondFetch(childExecutionResponse);
    });

    expect(result.current.childExecutions.size).toBe(1);
  });

  it('refetches as soon as a workflow.execute step starts, before it is terminal', async () => {
    mockIsExecuteSyncStepType.mockReturnValue(true);
    const { rerender } = renderHook(
      ({ execution }: { execution: WorkflowExecutionDto }) => useChildWorkflowExecutions(execution),
      {
        initialProps: {
          execution: createMockExecution({ status: ExecutionStatus.RUNNING, stepExecutions: [] }),
        },
        wrapper: createWrapper(queryClient),
      }
    );

    await waitFor(() => expect(mockGetChildrenExecutions).toHaveBeenCalledTimes(1));

    rerender({
      execution: createMockExecution({
        status: ExecutionStatus.RUNNING,
        stepExecutions: [executeStep('step-exec-1', ExecutionStatus.WAITING_FOR_CHILD)],
      }),
    });

    await waitFor(() => expect(mockGetChildrenExecutions).toHaveBeenCalledTimes(2));
  });

  describe('serial polling', () => {
    const runningParent = () =>
      createMockExecution({
        status: ExecutionStatus.RUNNING,
        finishedAt: undefined,
      });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });

    it('refetches on interval while parent execution is non-terminal', async () => {
      const execution = runningParent();

      renderHook(() => useChildWorkflowExecutions(execution), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(mockGetChildrenExecutions).toHaveBeenCalledTimes(1));

      mockGetChildrenExecutions.mockClear();
      await act(async () => {
        vi.advanceTimersByTime(CHILD_WORKFLOW_EXECUTIONS_POLL_INTERVAL_MS);
        await Promise.resolve();
      });

      await waitFor(() => expect(mockGetChildrenExecutions).toHaveBeenCalledTimes(1));
      expect(mockGetChildrenExecutions).toHaveBeenCalledWith('exec-1');
    });

    it('does not schedule serial refetches when parent is already terminal', async () => {
      const execution = createMockExecution();

      renderHook(() => useChildWorkflowExecutions(execution), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(mockGetChildrenExecutions).toHaveBeenCalledTimes(1));

      mockGetChildrenExecutions.mockClear();
      await act(async () => {
        vi.advanceTimersByTime(CHILD_WORKFLOW_EXECUTIONS_POLL_INTERVAL_MS * 3);
        await Promise.resolve();
      });

      expect(mockGetChildrenExecutions).not.toHaveBeenCalled();
    });

    it('stops serial polling when parent execution becomes terminal', async () => {
      const { rerender } = renderHook(
        ({ execution }: { execution: WorkflowExecutionDto }) =>
          useChildWorkflowExecutions(execution),
        {
          initialProps: { execution: runningParent() },
          wrapper: createWrapper(queryClient),
        }
      );

      await waitFor(() => expect(mockGetChildrenExecutions).toHaveBeenCalledTimes(1));

      rerender({ execution: createMockExecution() });

      mockGetChildrenExecutions.mockClear();
      await act(async () => {
        vi.advanceTimersByTime(CHILD_WORKFLOW_EXECUTIONS_POLL_INTERVAL_MS * 3);
        await Promise.resolve();
      });

      expect(mockGetChildrenExecutions).not.toHaveBeenCalled();
    });

    it('clears pending poll timer on unmount', async () => {
      const execution = runningParent();

      const { unmount } = renderHook(() => useChildWorkflowExecutions(execution), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(mockGetChildrenExecutions).toHaveBeenCalledTimes(1));

      unmount();

      mockGetChildrenExecutions.mockClear();
      await act(async () => {
        vi.advanceTimersByTime(CHILD_WORKFLOW_EXECUTIONS_POLL_INTERVAL_MS * 3);
        await Promise.resolve();
      });

      expect(mockGetChildrenExecutions).not.toHaveBeenCalled();
    });
  });
});
