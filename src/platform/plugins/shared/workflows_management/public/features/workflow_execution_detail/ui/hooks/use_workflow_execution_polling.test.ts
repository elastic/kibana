/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { useWorkflowExecution } from '../../../../entities/workflows/model/use_workflow_execution';
import { useWorkflowExecutionPolling } from './use_workflow_execution_polling';

// Mock the useWorkflowExecution hook
jest.mock('../../../../entities/workflows/model/use_workflow_execution');
const mockUseWorkflowExecution = useWorkflowExecution as jest.MockedFunction<
  typeof useWorkflowExecution
>;

// Helper function to create a complete UseQueryResult mock
const createMockQueryResult = <TData = unknown, TError = unknown>(
  overrides: Partial<UseQueryResult<TData, TError>> = {}
): UseQueryResult<TData, TError> =>
  ({
    data: undefined,
    error: null,
    isError: false,
    isLoading: false,
    isLoadingError: false,
    isRefetchError: false,
    isSuccess: true,
    status: 'success',
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    errorUpdateCount: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isPaused: false,
    isPlaceholderData: false,
    isPreviousData: false,
    isRefetching: false,
    isStale: false,
    refetch: jest.fn(),
    remove: jest.fn(),
    fetchStatus: 'idle' as const,
    ...overrides,
  } as UseQueryResult<TData, TError>);

// Mock timers
jest.useFakeTimers();

describe('useWorkflowExecutionPolling', () => {
  const mockWorkflowExecutionId = 'test-execution-id';
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  const createMockWorkflowDefinition = (): WorkflowYaml => ({
    version: '1' as const,
    name: 'test-workflow',
    enabled: true,
    triggers: [
      {
        type: 'manual' as const,
        enabled: true,
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
    duration: 1000,
    triggeredBy: 'manual',
    yaml: 'version: "1"\\nname: test-workflow\\nenabled: true\\ntriggers:\\n  - type: manual\\n    enabled: true\\nsteps:\\n  - name: test-step\\n    type: console.log\\n    with:\\n      message: Hello World',
  });

  it('should return workflow execution data, loading state, and error from useWorkflowExecution', () => {
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    const mockError = new Error('Test error');
    mockUseWorkflowExecution.mockReturnValue(
      createMockQueryResult<WorkflowExecutionDto, Error>({
        data: mockWorkflowExecution,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      })
    );

    const { result } = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

    expect(result.current.workflowExecution).toBe(mockWorkflowExecution);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(mockError);
  });

  it('should not start polling when workflow execution data is not available', () => {
    mockUseWorkflowExecution.mockReturnValue(
      createMockQueryResult<WorkflowExecutionDto, Error>({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      })
    );

    renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

    // Fast forward time to check if polling would occur
    jest.advanceTimersByTime(1000);

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
      it(`should poll every 500ms when status is ${status}`, () => {
        const mockWorkflowExecution = createMockWorkflowExecution(status);

        mockUseWorkflowExecution.mockReturnValue(
          createMockQueryResult<WorkflowExecutionDto, Error>({
            data: mockWorkflowExecution,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
          })
        );

        renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

        // Should not call refetch immediately
        expect(mockRefetch).not.toHaveBeenCalled();

        // After 500ms, should call refetch
        jest.advanceTimersByTime(500);
        expect(mockRefetch).toHaveBeenCalledTimes(1);

        // After another 500ms, should call refetch again
        jest.advanceTimersByTime(500);
        expect(mockRefetch).toHaveBeenCalledTimes(2);

        // After another 500ms, should call refetch again
        jest.advanceTimersByTime(500);
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
    ];

    terminalStatuses.forEach((status) => {
      it(`should stop polling when status changes to ${status}`, () => {
        // Start with a non-terminal status
        const initialWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);

        mockUseWorkflowExecution.mockReturnValue(
          createMockQueryResult<WorkflowExecutionDto, Error>({
            data: initialWorkflowExecution,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
          })
        );

        const { rerender } = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

        // Verify polling starts
        jest.advanceTimersByTime(500);
        expect(mockRefetch).toHaveBeenCalledTimes(1);

        // Update to terminal status
        const terminalWorkflowExecution = createMockWorkflowExecution(status);
        mockUseWorkflowExecution.mockReturnValue(
          createMockQueryResult<WorkflowExecutionDto, Error>({
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
        jest.advanceTimersByTime(2000);
        expect(mockRefetch).not.toHaveBeenCalled();
      });

      it(`should not start polling when initial status is terminal (${status})`, () => {
        const mockWorkflowExecution = createMockWorkflowExecution(status);

        mockUseWorkflowExecution.mockReturnValue(
          createMockQueryResult<WorkflowExecutionDto, Error>({
            data: mockWorkflowExecution,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
          })
        );

        renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

        // Fast forward time to check if polling would occur
        jest.advanceTimersByTime(2000);

        expect(mockRefetch).not.toHaveBeenCalled();
      });
    });
  });

  it('should clean up interval on unmount', () => {
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);

    mockUseWorkflowExecution.mockReturnValue(
      createMockQueryResult<WorkflowExecutionDto, Error>({
        data: mockWorkflowExecution,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      })
    );

    const { unmount } = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

    // Verify polling starts
    jest.advanceTimersByTime(500);
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    // Unmount the component
    unmount();

    // Clear previous calls
    mockRefetch.mockClear();

    // Fast forward time - should not call refetch anymore after unmount
    jest.advanceTimersByTime(2000);
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('should restart polling when workflow execution data changes from null to available', () => {
    // Start with no data
    mockUseWorkflowExecution.mockReturnValue(
      createMockQueryResult<WorkflowExecutionDto, Error>({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      })
    );

    const { rerender } = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

    // Should not poll yet
    jest.advanceTimersByTime(1000);
    expect(mockRefetch).not.toHaveBeenCalled();

    // Update with workflow execution data
    const mockWorkflowExecution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    mockUseWorkflowExecution.mockReturnValue(
      createMockQueryResult<WorkflowExecutionDto, Error>({
        data: mockWorkflowExecution,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      })
    );

    rerender();

    // Should start polling
    jest.advanceTimersByTime(500);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('should handle status transitions during polling', () => {
    // Start with running status
    let currentStatus = ExecutionStatus.RUNNING;
    const mockWorkflowExecution = createMockWorkflowExecution(currentStatus);

    mockUseWorkflowExecution.mockReturnValue(
      createMockQueryResult<WorkflowExecutionDto, Error>({
        data: mockWorkflowExecution,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      })
    );

    const { rerender } = renderHook(() => useWorkflowExecutionPolling(mockWorkflowExecutionId));

    // Verify initial polling
    jest.advanceTimersByTime(500);
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    // Change to another non-terminal status
    currentStatus = ExecutionStatus.WAITING;
    mockWorkflowExecution.status = currentStatus;
    rerender();

    // Should continue polling
    jest.advanceTimersByTime(500);
    expect(mockRefetch).toHaveBeenCalledTimes(2);

    // Change to terminal status
    currentStatus = ExecutionStatus.COMPLETED;
    mockWorkflowExecution.status = currentStatus;
    rerender();

    // Clear previous calls
    mockRefetch.mockClear();

    // Should stop polling
    jest.advanceTimersByTime(2000);
    expect(mockRefetch).not.toHaveBeenCalled();
  });
});
