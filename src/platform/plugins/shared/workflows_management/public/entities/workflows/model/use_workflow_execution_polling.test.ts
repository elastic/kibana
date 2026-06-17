/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { type PollingState, useWorkflowExecutionPolling } from './use_workflow_execution_polling';
import { WORKFLOW_EXECUTION_POLL_INTERVAL_MS } from '../../../hooks/polling_constants';
import { useAsyncThunkState } from '../../../hooks/use_async_thunk';

jest.mock('../../../hooks/use_async_thunk');
const mockUseAsyncThunkState = useAsyncThunkState as jest.MockedFunction<typeof useAsyncThunkState>;

describe('useWorkflowExecutionPolling', () => {
  const mockWorkflowExecutionId = 'test-execution-id';
  let mockLoadExecution: jest.Mock;
  let hookResult: RenderHookResult<PollingState, { id: string }> | null;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    hookResult = null;
    mockLoadExecution = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (hookResult?.unmount) {
      hookResult.unmount();
    }
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const createMockWorkflowDefinition = (): WorkflowYaml => ({
    version: '1' as const,
    name: 'test-workflow',
    enabled: true,
    triggers: [
      {
        type: 'manual' as const,
      },
    ],
    steps: [
      {
        name: 'test-step',
        type: 'console.log',
        with: { message: 'Hello World' },
      },
    ],
  });

  const createMockWorkflowExecution = (status: ExecutionStatus): WorkflowExecutionDto => ({
    spaceId: 'default',
    id: mockWorkflowExecutionId,
    status,
    error: null,
    isTestRun: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    workflowId: 'test-workflow-id',
    workflowName: 'test-workflow',
    workflowDefinition: createMockWorkflowDefinition(),
    stepId: undefined,
    stepExecutions: [],
    duration: WORKFLOW_EXECUTION_POLL_INTERVAL_MS * 2,
    triggeredBy: 'manual',
    yaml: 'version: "1"\\nname: test-workflow\\nenabled: true\\ntriggers:\\n  - type: manual\\nsteps:\\n  - name: test-step\\n    type: console.log\\n    with:\\n      message: Hello World',
  });

  const setupMock = (
    workflowExecution: WorkflowExecutionDto | undefined,
    isLoading: boolean = false,
    error: Error | null = null,
    createNewFunction: boolean = false
  ) => {
    if (createNewFunction) {
      const loadExecutionFn = jest.fn().mockResolvedValue(undefined);
      mockLoadExecution = loadExecutionFn;
      mockUseAsyncThunkState.mockReturnValue([
        loadExecutionFn,
        {
          result: workflowExecution,
          isLoading,
          error,
        },
      ]);
    } else {
      mockUseAsyncThunkState.mockReturnValue([
        mockLoadExecution,
        {
          result: workflowExecution,
          isLoading,
          error,
        },
      ]);
    }
  };

  const flushPoll = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  const advancePollInterval = async () => {
    await act(async () => {
      jest.advanceTimersByTime(WORKFLOW_EXECUTION_POLL_INTERVAL_MS);
      await Promise.resolve();
    });
  };

  it('should return workflow execution data, loading state, and error from useAsyncThunkState', () => {
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    const mockError = new Error('Test error');
    setupMock(mockWorkflowExecution, false, mockError);

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    const { result } = hookResult;

    expect(result.current.workflowExecution).toBe(mockWorkflowExecution);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(mockError);
  });

  it('should start polling immediately', async () => {
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    setupMock(mockWorkflowExecution);

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    await flushPoll();

    expect(mockLoadExecution).toHaveBeenCalledTimes(1);
    expect(mockLoadExecution).toHaveBeenCalledWith({ id: mockWorkflowExecutionId });
  });

  it('should poll again after the previous poll finishes and the interval elapses', async () => {
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    setupMock(mockWorkflowExecution);

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    await flushPoll();
    expect(mockLoadExecution).toHaveBeenCalledTimes(1);

    await advancePollInterval();
    expect(mockLoadExecution).toHaveBeenCalledTimes(2);

    await advancePollInterval();
    expect(mockLoadExecution).toHaveBeenCalledTimes(3);
  });

  describe('polling behavior for non-terminal statuses', () => {
    const nonTerminalStatuses = [
      ExecutionStatus.PENDING,
      ExecutionStatus.WAITING,
      ExecutionStatus.WAITING_FOR_INPUT,
      ExecutionStatus.RUNNING,
    ];

    nonTerminalStatuses.forEach((status) => {
      it(`should continue polling when status is ${status}`, async () => {
        const mockWorkflowExecution = createMockWorkflowExecution(status);
        setupMock(mockWorkflowExecution);

        hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
        await flushPoll();
        expect(mockLoadExecution).toHaveBeenCalledTimes(1);

        await advancePollInterval();
        expect(mockLoadExecution).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('polling stops for terminal statuses', () => {
    TerminalExecutionStatuses.forEach((status: ExecutionStatus) => {
      it(`should stop polling when status changes to ${status}`, async () => {
        const initialWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
        setupMock(initialWorkflowExecution);

        hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
        const { rerender } = hookResult;

        await flushPoll();
        expect(mockLoadExecution).toHaveBeenCalledTimes(1);

        await advancePollInterval();
        expect(mockLoadExecution).toHaveBeenCalledTimes(2);

        const terminalWorkflowExecution = createMockWorkflowExecution(status);
        setupMock(terminalWorkflowExecution);

        await act(async () => {
          rerender();
          await Promise.resolve();
        });

        mockLoadExecution.mockClear();

        await act(async () => {
          jest.advanceTimersByTime(WORKFLOW_EXECUTION_POLL_INTERVAL_MS * 4);
          await Promise.resolve();
        });
        expect(mockLoadExecution).not.toHaveBeenCalled();
      });

      it(`should stop after the first poll when initial status is terminal (${status})`, async () => {
        const mockWorkflowExecution = createMockWorkflowExecution(status);
        setupMock(mockWorkflowExecution);

        hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
        await flushPoll();
        expect(mockLoadExecution).toHaveBeenCalledTimes(1);

        mockLoadExecution.mockClear();

        await act(async () => {
          jest.advanceTimersByTime(WORKFLOW_EXECUTION_POLL_INTERVAL_MS * 4);
          await Promise.resolve();
        });
        expect(mockLoadExecution).not.toHaveBeenCalled();
      });
    });
  });

  it('should clean up polling on unmount', async () => {
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    setupMock(mockWorkflowExecution);

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    const { unmount } = hookResult;

    await flushPoll();
    expect(mockLoadExecution).toHaveBeenCalledTimes(1);

    await advancePollInterval();
    expect(mockLoadExecution).toHaveBeenCalledTimes(2);

    await act(async () => {
      unmount();
    });

    mockLoadExecution.mockClear();

    await act(async () => {
      jest.advanceTimersByTime(WORKFLOW_EXECUTION_POLL_INTERVAL_MS * 4);
      await Promise.resolve();
    });
    expect(mockLoadExecution).not.toHaveBeenCalled();
  });

  it('should handle status transitions during polling', async () => {
    const runningExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    setupMock(runningExecution, false, null, true);

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    const { rerender } = hookResult;

    await flushPoll();
    expect(mockLoadExecution).toHaveBeenCalledTimes(1);

    await advancePollInterval();
    expect(mockLoadExecution).toHaveBeenCalledTimes(2);

    const waitingExecution = createMockWorkflowExecution(ExecutionStatus.WAITING);
    setupMock(waitingExecution);
    await act(async () => {
      rerender();
      await Promise.resolve();
    });

    await advancePollInterval();
    expect(mockLoadExecution).toHaveBeenCalledTimes(3);

    const completedExecution = createMockWorkflowExecution(ExecutionStatus.COMPLETED);
    setupMock(completedExecution);
    await act(async () => {
      rerender();
      await Promise.resolve();
    });

    mockLoadExecution.mockClear();

    await act(async () => {
      jest.advanceTimersByTime(WORKFLOW_EXECUTION_POLL_INTERVAL_MS * 4);
      await Promise.resolve();
    });
    expect(mockLoadExecution).not.toHaveBeenCalled();
  });

  it('should restart polling when workflowExecutionId changes after a terminal execution', async () => {
    const completedExecution = createMockWorkflowExecution(ExecutionStatus.COMPLETED);
    setupMock(completedExecution);

    hookResult = renderHook(({ id }: { id: string }) => useWorkflowExecutionPolling(id), {
      initialProps: { id: mockWorkflowExecutionId },
    });
    await flushPoll();
    expect(mockLoadExecution).toHaveBeenCalledTimes(1);

    mockLoadExecution.mockClear();

    const runningExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    runningExecution.id = 'new-execution-id';
    setupMock(runningExecution);

    await act(async () => {
      hookResult?.rerender({ id: 'new-execution-id' });
      await Promise.resolve();
    });
    expect(mockLoadExecution).toHaveBeenCalledWith({ id: 'new-execution-id' });

    await advancePollInterval();
    expect(mockLoadExecution).toHaveBeenCalledTimes(2);
  });

  it('should set isLoading to false when execution reaches terminal state', async () => {
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.COMPLETED);
    setupMock(mockWorkflowExecution);

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    const { result } = hookResult;

    await flushPoll();

    expect(result.current.isLoading).toBe(false);
  });
});
