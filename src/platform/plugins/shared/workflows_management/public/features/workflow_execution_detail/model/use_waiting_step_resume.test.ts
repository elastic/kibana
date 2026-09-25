/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useQueryClient } from '@kbn/react-query';
import { ExecutionStatus } from '@kbn/workflows';
import { useStepExecution } from './use_step_execution';
import { useWaitingStepResume } from './use_waiting_step_resume';
import {
  createMockStepExecutionDto,
  createMockWorkflowExecutionDto,
} from '../../../shared/test_utils';

jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: jest.fn(),
}));

jest.mock('./use_step_execution', () => ({
  useStepExecution: jest.fn(),
}));

const mockUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;
const mockUseStepExecution = useStepExecution as jest.MockedFunction<typeof useStepExecution>;

describe('useWaitingStepResume', () => {
  const mockInvalidateQueries = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    } as unknown as ReturnType<typeof useQueryClient>);
    mockUseStepExecution.mockReturnValue({ data: undefined, isLoading: false } as ReturnType<
      typeof useStepExecution
    >);
  });

  it('returns empty resume props when the execution is not waiting for input', () => {
    const { result } = renderHook(() =>
      useWaitingStepResume('exec-1', createMockWorkflowExecutionDto())
    );

    expect(result.current.waitingStepExecutionId).toBeUndefined();
    expect(result.current.resumeMessage).toBeUndefined();
    expect(mockUseStepExecution).toHaveBeenCalledWith(
      'exec-1',
      undefined,
      ExecutionStatus.WAITING_FOR_INPUT
    );
  });

  it('targets the first WAITING_FOR_INPUT step and reads resume copy from its input', () => {
    mockUseStepExecution.mockReturnValue({
      data: {
        id: 'step-wait',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        input: {
          message: 'Approve this',
          schema: { type: 'object' },
          approveLabel: 'Approve',
          rejectLabel: 'Reject',
        },
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useStepExecution>);

    const execution = createMockWorkflowExecutionDto({
      status: ExecutionStatus.WAITING_FOR_INPUT,
      stepExecutions: [
        createMockStepExecutionDto({
          id: 'step-done',
          status: ExecutionStatus.COMPLETED,
        }),
        createMockStepExecutionDto({
          id: 'step-wait',
          stepId: 'request_approval',
          status: ExecutionStatus.WAITING_FOR_INPUT,
          startedAt: '2024-01-01T00:00:01Z',
        }),
      ],
    });

    const { result } = renderHook(() => useWaitingStepResume('exec-1', execution));

    expect(mockUseStepExecution).toHaveBeenCalledWith(
      'exec-1',
      'step-wait',
      ExecutionStatus.WAITING_FOR_INPUT
    );
    expect(result.current).toEqual(
      expect.objectContaining({
        waitingStepExecutionId: 'step-wait',
        waitingStepStartedAt: '2024-01-01T00:00:01Z',
        resumeMessage: 'Approve this',
        resumeSchema: { type: 'object' },
        approvalLabels: { approveLabel: 'Approve', rejectLabel: 'Reject' },
        hasResumeError: false,
      })
    );
  });

  it('invalidates step I/O queries when the execution leaves wait-for-input', () => {
    const waiting = createMockWorkflowExecutionDto({
      status: ExecutionStatus.WAITING_FOR_INPUT,
      stepExecutions: [
        createMockStepExecutionDto({
          id: 'step-wait',
          status: ExecutionStatus.WAITING_FOR_INPUT,
        }),
      ],
    });
    const completed = createMockWorkflowExecutionDto({
      status: ExecutionStatus.COMPLETED,
    });

    const { rerender } = renderHook(({ execution }) => useWaitingStepResume('exec-1', execution), {
      initialProps: { execution: waiting },
    });

    rerender({ execution: completed });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['stepExecution', 'exec-1'],
    });
  });

  it('does not return a waiting step while the full step input is loading', () => {
    mockUseStepExecution.mockReturnValue({ data: undefined, isLoading: true } as ReturnType<
      typeof useStepExecution
    >);

    const execution = createMockWorkflowExecutionDto({
      status: ExecutionStatus.WAITING_FOR_INPUT,
      stepExecutions: [
        createMockStepExecutionDto({
          id: 'step-wait',
          status: ExecutionStatus.WAITING_FOR_INPUT,
        }),
      ],
    });

    const { result } = renderHook(() => useWaitingStepResume('exec-1', execution));

    expect(result.current.waitingStepExecutionId).toBeUndefined();
    expect(result.current.approvalLabels).toBeUndefined();
  });

  it('does not return a waiting step when getStepExecution fails (data undefined, isLoading false)', () => {
    mockUseStepExecution.mockReturnValue({ data: undefined, isLoading: false } as ReturnType<
      typeof useStepExecution
    >);

    const execution = createMockWorkflowExecutionDto({
      status: ExecutionStatus.WAITING_FOR_INPUT,
      stepExecutions: [
        createMockStepExecutionDto({
          id: 'step-wait',
          status: ExecutionStatus.WAITING_FOR_INPUT,
        }),
      ],
    });

    const { result } = renderHook(() => useWaitingStepResume('exec-1', execution));

    expect(result.current.waitingStepExecutionId).toBeUndefined();
    expect(result.current.resumeMessage).toBeUndefined();
  });

  it('reports a resume error and retries when the waiting step fetch fails', () => {
    const refetch = jest.fn();
    mockUseStepExecution.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useStepExecution>);

    const execution = createMockWorkflowExecutionDto({
      status: ExecutionStatus.WAITING_FOR_INPUT,
      stepExecutions: [
        createMockStepExecutionDto({
          id: 'step-wait',
          status: ExecutionStatus.WAITING_FOR_INPUT,
        }),
      ],
    });

    const { result } = renderHook(() => useWaitingStepResume('exec-1', execution));

    expect(result.current.waitingStepExecutionId).toBeUndefined();
    expect(result.current.hasResumeError).toBe(true);

    result.current.retryResume();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('reports no resume error when the run is not waiting for input', () => {
    mockUseStepExecution.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useStepExecution>);

    const execution = createMockWorkflowExecutionDto({ status: ExecutionStatus.RUNNING });

    const { result } = renderHook(() => useWaitingStepResume('exec-1', execution));

    expect(result.current.hasResumeError).toBe(false);
  });

  it('ignores a stale waiting execution after executionId changes', () => {
    mockUseStepExecution.mockReturnValue({
      data: {
        id: 'step-wait',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        input: { message: 'Approve this' },
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useStepExecution>);

    const waiting = createMockWorkflowExecutionDto({
      id: 'exec-old',
      status: ExecutionStatus.WAITING_FOR_INPUT,
      stepExecutions: [
        createMockStepExecutionDto({
          id: 'step-wait',
          status: ExecutionStatus.WAITING_FOR_INPUT,
        }),
      ],
    });

    const { result, rerender } = renderHook(
      ({ executionId, execution }) => useWaitingStepResume(executionId, execution),
      { initialProps: { executionId: 'exec-old', execution: waiting } }
    );

    expect(result.current.waitingStepExecutionId).toBe('step-wait');

    rerender({ executionId: 'exec-new', execution: waiting });

    expect(result.current.waitingStepExecutionId).toBeUndefined();
    expect(mockUseStepExecution).toHaveBeenLastCalledWith(
      'exec-new',
      undefined,
      ExecutionStatus.WAITING_FOR_INPUT
    );
  });
});
