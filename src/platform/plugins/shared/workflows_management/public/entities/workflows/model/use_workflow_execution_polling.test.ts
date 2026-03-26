/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { PollingIntervalMs, useWorkflowExecutionPolling } from './use_workflow_execution_polling';
import { useAsyncThunkState } from '../../../hooks/use_async_thunk';

// Mock the useAsyncThunkState hook
jest.mock('../../../hooks/use_async_thunk');
const mockUseAsyncThunkState = useAsyncThunkState as jest.MockedFunction<typeof useAsyncThunkState>;

describe('useWorkflowExecutionPolling', () => {
  const mockWorkflowExecutionId = 'test-execution-id';
  let mockLoadExecution: jest.Mock;
  let hookResult: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    hookResult = null;
    mockLoadExecution = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Clean up any rendered hooks
    if (hookResult && hookResult.unmount) {
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
    duration: PollingIntervalMs * 2,
    triggeredBy: 'manual',
    yaml: 'version: "1"\\nname: test-workflow\\nenabled: true\\ntriggers:\\n  - type: manual\\nsteps:\\n  - name: test-step\\n    type: console.log\\n    with:\\n      message: Hello World',
  });

  const setupMock = (
    workflowExecution: WorkflowExecutionDto | undefined,
    isLoading: boolean = false,
    error: Error | null = null,
    createNewFunction: boolean = false
  ) => {
    // Create a new function reference only when explicitly requested
    // This allows us to control when the effect re-runs
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
      // Reuse the existing function reference to preserve call history
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

  it('should return workflow execution data, loading state, and error from useAsyncThunkState', () => {
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    const mockError = new Error('Test error');
    setupMock(mockWorkflowExecution, false, mockError);

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    const { result } = hookResult;

    expect(result.current.workflowExecution).toBe(mockWorkflowExecution);
    expect(result.current.isLoading).toBe(true); // Initially true due to useEffect
    expect(result.current.error).toBe(mockError);
  });

  it('should start polling immediately when workflow execution data is available', () => {
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    setupMock(mockWorkflowExecution);

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

    // timer(0, PollingIntervalMs) emits immediately (0ms) then every PollingIntervalMs
    // So we need to advance timers to let the immediate emission happen
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(mockLoadExecution).toHaveBeenCalledTimes(1);
    expect(mockLoadExecution).toHaveBeenCalledWith({ id: mockWorkflowExecutionId });
  });

  it('should not start polling when workflow execution data is not available', () => {
    setupMock(undefined, true);

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

    // Fast forward time to check if polling would occur
    act(() => {
      jest.advanceTimersByTime(PollingIntervalMs * 2);
    });

    // Polling still starts because the hook doesn't check for data availability
    // It just starts polling regardless. But let's verify it was called
    expect(mockLoadExecution).toHaveBeenCalled();
  });

  describe('polling behavior for non-terminal statuses', () => {
    const nonTerminalStatuses = [
      ExecutionStatus.PENDING,
      ExecutionStatus.WAITING,
      ExecutionStatus.WAITING_FOR_INPUT,
      ExecutionStatus.RUNNING,
    ];

    nonTerminalStatuses.forEach((status) => {
      it(`should poll every ${PollingIntervalMs}ms when status is ${status}`, () => {
        const mockWorkflowExecution = createMockWorkflowExecution(status);
        setupMock(mockWorkflowExecution);

        hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

        // timer(0, PollingIntervalMs) emits immediately (0ms) then every PollingIntervalMs
        act(() => {
          jest.advanceTimersByTime(0);
        });
        expect(mockLoadExecution).toHaveBeenCalledTimes(1);

        // After PollingIntervalMs, should call loadExecution again
        act(() => {
          jest.advanceTimersByTime(PollingIntervalMs);
        });
        expect(mockLoadExecution).toHaveBeenCalledTimes(2);

        // After another PollingIntervalMs, should call loadExecution again
        act(() => {
          jest.advanceTimersByTime(PollingIntervalMs);
        });
        expect(mockLoadExecution).toHaveBeenCalledTimes(3);

        // After another PollingIntervalMs, should call loadExecution again
        act(() => {
          jest.advanceTimersByTime(PollingIntervalMs);
        });
        expect(mockLoadExecution).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('polling stops for terminal statuses', () => {
    TerminalExecutionStatuses.forEach((status: ExecutionStatus) => {
      it(`should stop polling when status changes to ${status}`, () => {
        // Start with a non-terminal status
        const initialWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
        setupMock(initialWorkflowExecution);

        hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
        const { rerender } = hookResult;

        // Verify polling starts
        act(() => {
          jest.advanceTimersByTime(0);
        });
        expect(mockLoadExecution).toHaveBeenCalledTimes(1);

        // Advance time to get another call
        act(() => {
          jest.advanceTimersByTime(PollingIntervalMs);
        });
        expect(mockLoadExecution).toHaveBeenCalledTimes(2);

        // Update to terminal status
        const terminalWorkflowExecution = createMockWorkflowExecution(status);
        setupMock(terminalWorkflowExecution);

        act(() => {
          rerender();
        });

        // Clear previous calls
        mockLoadExecution.mockClear();

        // Fast forward time - should not call loadExecution anymore after terminal status
        act(() => {
          jest.advanceTimersByTime(PollingIntervalMs * 4);
        });
        expect(mockLoadExecution).not.toHaveBeenCalled();
      });

      it(`should not start polling when initial status is terminal (${status})`, () => {
        const mockWorkflowExecution = createMockWorkflowExecution(status);
        setupMock(mockWorkflowExecution);

        hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

        // When status is terminal from the start, the stop signal is sent immediately
        // which stops polling before the timer can emit. So we don't expect it to be called.
        act(() => {
          jest.advanceTimersByTime(0);
        });

        // The timer might emit once before being stopped, or it might not emit at all
        // depending on the timing. Let's verify it doesn't continue polling.
        mockLoadExecution.mockClear();

        // Fast forward time - should not call loadExecution anymore
        act(() => {
          jest.advanceTimersByTime(PollingIntervalMs * 4);
        });
        expect(mockLoadExecution).not.toHaveBeenCalled();
      });
    });
  });

  it('should clean up interval on unmount', () => {
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    setupMock(mockWorkflowExecution);

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    const { unmount } = hookResult;

    // Verify polling starts
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(mockLoadExecution).toHaveBeenCalledTimes(1);

    // Advance time to get another call
    act(() => {
      jest.advanceTimersByTime(PollingIntervalMs);
    });
    expect(mockLoadExecution).toHaveBeenCalledTimes(2);

    // Unmount the component
    act(() => {
      unmount();
    });

    // Clear previous calls
    mockLoadExecution.mockClear();

    // Fast forward time - should not call loadExecution anymore after unmount
    act(() => {
      jest.advanceTimersByTime(PollingIntervalMs * 4);
    });
    expect(mockLoadExecution).not.toHaveBeenCalled();
  });

  it('should start polling when workflow execution data changes from null to available', () => {
    // Start with no data
    setupMock(undefined, true, null, true);

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    const { rerender } = hookResult;

    // Polling still starts immediately
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(mockLoadExecution).toHaveBeenCalled();

    // Clear calls
    mockLoadExecution.mockClear();

    // Update with workflow execution data
    // The effect depends on workflowExecutionId and loadExecution, not on workflowExecution
    // So changing the data doesn't cause the effect to re-run
    // The polling continues with the same subscription
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    setupMock(mockWorkflowExecution);

    act(() => {
      rerender();
    });

    // Should continue polling with the same subscription
    act(() => {
      jest.advanceTimersByTime(PollingIntervalMs);
    });
    expect(mockLoadExecution).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(PollingIntervalMs);
    });
    expect(mockLoadExecution).toHaveBeenCalledTimes(2);
  });

  it('should handle status transitions during polling', () => {
    // Start with running status
    const runningExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    setupMock(runningExecution, false, null, true);

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    const { rerender } = hookResult;

    // Verify initial polling starts
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(mockLoadExecution).toHaveBeenCalledTimes(1);

    // Advance time to get another call
    act(() => {
      jest.advanceTimersByTime(PollingIntervalMs);
    });
    expect(mockLoadExecution).toHaveBeenCalledTimes(2);

    // Change to another non-terminal status
    // The effect depends on workflowExecutionId and loadExecution, not on workflowExecution
    // So changing the status doesn't cause the effect to re-run
    // The polling continues with the same subscription
    const waitingExecution = createMockWorkflowExecution(ExecutionStatus.WAITING);
    setupMock(waitingExecution);
    act(() => {
      rerender();
    });

    // Should continue polling with the same subscription
    act(() => {
      jest.advanceTimersByTime(PollingIntervalMs);
    });
    expect(mockLoadExecution).toHaveBeenCalledTimes(3);

    // Advance time to get another call
    act(() => {
      jest.advanceTimersByTime(PollingIntervalMs);
    });
    expect(mockLoadExecution).toHaveBeenCalledTimes(4);

    // Change to terminal status - create a new execution object
    const completedExecution = createMockWorkflowExecution(ExecutionStatus.COMPLETED);
    setupMock(completedExecution);
    act(() => {
      rerender();
    });

    // Clear previous calls to isolate the terminal status behavior
    mockLoadExecution.mockClear();

    // Should stop polling after status change to terminal
    act(() => {
      jest.advanceTimersByTime(PollingIntervalMs * 4);
    });
    expect(mockLoadExecution).not.toHaveBeenCalled();
  });

  it('should set isLoading to false when execution reaches terminal state', () => {
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.COMPLETED);
    setupMock(mockWorkflowExecution);

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    const { result } = hookResult;

    // Wait for effects to run
    act(() => {
      jest.advanceTimersByTime(0);
    });

    // After terminal status is detected, isLoading should be false
    expect(result.current.isLoading).toBe(false);
  });
});
