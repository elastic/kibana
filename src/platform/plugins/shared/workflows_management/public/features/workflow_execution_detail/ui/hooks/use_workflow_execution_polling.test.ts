/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { UseQueryResult } from '@kbn/react-query';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { PollingIntervalMs, useWorkflowExecutionPolling } from './use_workflow_execution_polling';
import { useWorkflowExecution } from '../../../../entities/workflows/model/use_workflow_execution';

// Mock the useWorkflowExecution hook
jest.mock('../../../../entities/workflows/model/use_workflow_execution');
const mockUseWorkflowExecution = useWorkflowExecution as jest.MockedFunction<
  typeof useWorkflowExecution
>;

// Helper function to create a complete UseQueryResult mock
const createMockQueryResult = (
  overrides: Partial<UseQueryResult<WorkflowExecutionDto, Error>> = {}
): UseQueryResult<WorkflowExecutionDto, Error> =>
  ({
    data: undefined,
    error: null,
    isLoading: false,
    refetch: jest.fn(),
    ...overrides,
  } as UseQueryResult<WorkflowExecutionDto, Error>);

describe('useWorkflowExecutionPolling', () => {
  const mockWorkflowExecutionId = 'test-execution-id';
  const mockRefetch = jest.fn();
  let hookResult: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    hookResult = null;
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

  it('should return workflow execution data, loading state, and error from useWorkflowExecution', () => {
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    const mockError = new Error('Test error');
    mockUseWorkflowExecution.mockReturnValue(
      createMockQueryResult({
        data: mockWorkflowExecution,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      })
    );

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    const { result } = hookResult;

    expect(result.current.workflowExecution).toBe(mockWorkflowExecution);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(mockError);
  });

  it('should not start polling when workflow execution data is not available', () => {
    mockUseWorkflowExecution.mockReturnValue(
      createMockQueryResult({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      })
    );

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

    // Fast forward time to check if polling would occur
    jest.advanceTimersByTime(PollingIntervalMs * 2);

    expect(mockRefetch).not.toHaveBeenCalled();
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

        mockUseWorkflowExecution.mockReturnValue(
          createMockQueryResult({
            data: mockWorkflowExecution,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
          })
        );

        hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

        // Should not call refetch immediately (interval starts but first call is after PollingIntervalMs)
        expect(mockRefetch).not.toHaveBeenCalled();

        // After PollingIntervalMs, should call refetch for the first time
        jest.advanceTimersByTime(PollingIntervalMs);
        expect(mockRefetch).toHaveBeenCalledTimes(1);

        // After another PollingIntervalMs, should call refetch again
        jest.advanceTimersByTime(PollingIntervalMs);
        expect(mockRefetch).toHaveBeenCalledTimes(2);

        // After another PollingIntervalMs, should call refetch again
        jest.advanceTimersByTime(PollingIntervalMs);
        expect(mockRefetch).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('polling stops for terminal statuses', () => {
    const terminalStatuses = [
      ExecutionStatus.COMPLETED,
      ExecutionStatus.FAILED,
      ExecutionStatus.CANCELLED,
      ExecutionStatus.SKIPPED,
      ExecutionStatus.TIMED_OUT,
    ];

    terminalStatuses.forEach((status) => {
      it(`should stop polling when status changes to ${status}`, () => {
        // Start with a non-terminal status
        const initialWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);

        mockUseWorkflowExecution.mockReturnValue(
          createMockQueryResult({
            data: initialWorkflowExecution,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
          })
        );

        hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
        const { rerender } = hookResult;

        // Verify polling starts
        jest.advanceTimersByTime(PollingIntervalMs);
        expect(mockRefetch).toHaveBeenCalledTimes(1);

        // Update to terminal status
        const terminalWorkflowExecution = createMockWorkflowExecution(status);
        mockUseWorkflowExecution.mockReturnValue(
          createMockQueryResult({
            data: terminalWorkflowExecution,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
          })
        );

        rerender();

        // Clear previous calls
        mockRefetch.mockClear();

        // Fast forward time - should not call refetch anymore
        jest.advanceTimersByTime(PollingIntervalMs * 4);
        expect(mockRefetch).not.toHaveBeenCalled();
      });

      it(`should not start polling when initial status is terminal (${status})`, () => {
        const mockWorkflowExecution = createMockWorkflowExecution(status);

        mockUseWorkflowExecution.mockReturnValue(
          createMockQueryResult({
            data: mockWorkflowExecution,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
          })
        );

        hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

        // Fast forward time to check if polling would occur
        jest.advanceTimersByTime(PollingIntervalMs * 4);

        expect(mockRefetch).not.toHaveBeenCalled();
      });
    });
  });

  it('should clean up interval on unmount', () => {
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);

    mockUseWorkflowExecution.mockReturnValue(
      createMockQueryResult({
        data: mockWorkflowExecution,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      })
    );

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    const { unmount } = hookResult;

    // Verify polling starts
    jest.advanceTimersByTime(PollingIntervalMs);
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    // Unmount the component
    unmount();

    // Clear previous calls
    mockRefetch.mockClear();

    // Fast forward time - should not call refetch anymore after unmount
    jest.advanceTimersByTime(PollingIntervalMs * 4);
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('should restart polling when workflow execution data changes from null to available', () => {
    // Start with no data
    mockUseWorkflowExecution.mockReturnValue(
      createMockQueryResult({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      })
    );

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    const { rerender } = hookResult;

    // Should not poll yet
    jest.advanceTimersByTime(PollingIntervalMs * 2);
    expect(mockRefetch).not.toHaveBeenCalled();

    // Update with workflow execution data
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    mockUseWorkflowExecution.mockReturnValue(
      createMockQueryResult({
        data: mockWorkflowExecution,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      })
    );

    rerender();

    // Should start polling
    jest.advanceTimersByTime(PollingIntervalMs);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('should handle status transitions during polling', () => {
    // Start with running status
    const runningExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);

    mockUseWorkflowExecution.mockReturnValue(
      createMockQueryResult({
        data: runningExecution,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      })
    );

    hookResult = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));
    const { rerender } = hookResult;

    // Verify initial polling starts
    jest.advanceTimersByTime(PollingIntervalMs);
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    // Change to another non-terminal status
    const waitingExecution = createMockWorkflowExecution(ExecutionStatus.WAITING);
    mockUseWorkflowExecution.mockReturnValue(
      createMockQueryResult({
        data: waitingExecution,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      })
    );
    rerender();

    // Should continue polling
    jest.advanceTimersByTime(PollingIntervalMs);
    expect(mockRefetch).toHaveBeenCalledTimes(2);

    // Change to terminal status - create a new execution object
    const completedExecution = createMockWorkflowExecution(ExecutionStatus.COMPLETED);
    mockUseWorkflowExecution.mockReturnValue(
      createMockQueryResult({
        data: completedExecution,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      })
    );
    rerender();

    // Clear previous calls to isolate the terminal status behavior
    mockRefetch.mockClear();

    // Should stop polling after status change to terminal
    jest.advanceTimersByTime(PollingIntervalMs * 4);
    expect(mockRefetch).not.toHaveBeenCalled();
  });
});
