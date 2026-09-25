/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux-v7';
import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { useWorkflowExecutionPolling } from './use_workflow_execution_polling';
import { WORKFLOW_EXECUTION_POLL_INTERVAL_MS } from '../../../hooks/polling_constants';
import { createMockStore, getMockServices } from '../store/__mocks__/store.mock';
import type { MockStore } from '../store/__mocks__/store.mock';

const mockGetExecution = jest.fn();
const mockGetExecutionSteps = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  WorkflowApi: jest.fn().mockImplementation(() => ({
    getExecution: mockGetExecution,
    getExecutionSteps: mockGetExecutionSteps,
  })),
}));
jest.mock('../store/workflow_detail/utils/computation', () => ({
  performComputation: jest.fn(() => ({ yamlString: 'test' })),
}));

describe('useWorkflowExecutionPolling', () => {
  const mockWorkflowExecutionId = 'test-execution-id';
  let store: MockStore;

  beforeEach(() => {
    jest.useFakeTimers();
    mockGetExecution.mockReset();
    mockGetExecutionSteps.mockReset();
    mockGetExecutionSteps.mockResolvedValue({ results: [], total: 0, page: 1, size: 5000 });
    store = createMockStore();
  });

  afterEach(() => {
    jest.clearAllTimers();
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

  const renderPolling = (id = mockWorkflowExecutionId) =>
    renderHook(({ executionId }) => useWorkflowExecutionPolling(executionId), {
      initialProps: { executionId: id },
      wrapper: ({ children }: React.PropsWithChildren) =>
        React.createElement(Provider, { store }, children),
    });

  const advance = async (milliseconds = 0) => {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(milliseconds);
    });
  };

  it('starts immediately and returns the loaded execution', async () => {
    const execution = createMockWorkflowExecution(ExecutionStatus.RUNNING);
    mockGetExecution.mockResolvedValue(execution);
    const { result } = renderPolling();
    expect(result.current.isLoading).toBe(true);
    await advance();

    expect(mockGetExecution).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({ workflowExecution: execution, isLoading: false, error: null });
  });

  it('waits for the previous request and the polling interval', async () => {
    const response = Promise.withResolvers<WorkflowExecutionDto>();
    mockGetExecution
      .mockReturnValueOnce(response.promise)
      .mockResolvedValue(createMockWorkflowExecution(ExecutionStatus.RUNNING));
    renderPolling();
    await advance(WORKFLOW_EXECUTION_POLL_INTERVAL_MS * 3);
    expect(mockGetExecution).toHaveBeenCalledTimes(1);
    await act(async () => response.resolve(createMockWorkflowExecution(ExecutionStatus.RUNNING)));
    await advance(WORKFLOW_EXECUTION_POLL_INTERVAL_MS);
    expect(mockGetExecution).toHaveBeenCalledTimes(2);
  });

  it.each([
    { total: 5000, interval: 1000 },
    { total: 5001, interval: 5000 },
  ])('waits $interval ms between polls for $total steps', async ({ total, interval }) => {
    mockGetExecution.mockResolvedValue(createMockWorkflowExecution(ExecutionStatus.RUNNING));
    mockGetExecutionSteps.mockResolvedValue({ results: [], total });
    renderPolling();
    await advance();

    await advance(interval - 1);
    expect(mockGetExecution).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(mockGetExecution).toHaveBeenCalledTimes(2);
  });

  it('slows down immediately after a poll discovers more than 5000 steps', async () => {
    mockGetExecution.mockResolvedValue(createMockWorkflowExecution(ExecutionStatus.RUNNING));
    mockGetExecutionSteps.mockResolvedValue({ results: [], total: 5000 });
    renderPolling();
    await advance();
    mockGetExecutionSteps.mockResolvedValue({ results: [], total: 5001 });
    await advance(1000);
    expect(mockGetExecution).toHaveBeenCalledTimes(2);

    await advance(4999);
    expect(mockGetExecution).toHaveBeenCalledTimes(2);
    await advance(1);
    expect(mockGetExecution).toHaveBeenCalledTimes(3);
  });

  it('loads a newly selected small run immediately and restores the one-second interval', async () => {
    mockGetExecution.mockImplementation(async (id: string) => ({
      ...createMockWorkflowExecution(ExecutionStatus.RUNNING),
      id,
    }));
    mockGetExecutionSteps.mockResolvedValue({ results: [], total: 10000 });
    const { rerender } = renderPolling();
    await advance();
    mockGetExecutionSteps.mockResolvedValue({ results: [], total: 1 });

    rerender({ executionId: 'exec-b' });
    await advance();
    expect(mockGetExecution).toHaveBeenCalledTimes(2);
    await advance(999);
    expect(mockGetExecution).toHaveBeenCalledTimes(2);
    await advance(1);
    expect(mockGetExecution).toHaveBeenCalledTimes(3);
  });

  it.each([
    ExecutionStatus.PENDING,
    ExecutionStatus.WAITING,
    ExecutionStatus.WAITING_FOR_INPUT,
    ExecutionStatus.RUNNING,
  ])('continues polling while status is %s', async (status) => {
    mockGetExecution.mockResolvedValue(createMockWorkflowExecution(status));
    renderPolling();
    await advance();
    await advance(WORKFLOW_EXECUTION_POLL_INTERVAL_MS);
    expect(mockGetExecution).toHaveBeenCalledTimes(2);
  });

  it.each(TerminalExecutionStatuses)('stops after a transition to %s', async (status) => {
    mockGetExecution
      .mockResolvedValueOnce(createMockWorkflowExecution(ExecutionStatus.RUNNING))
      .mockResolvedValue(createMockWorkflowExecution(status));
    const { result } = renderPolling();
    await advance();
    await advance(WORKFLOW_EXECUTION_POLL_INTERVAL_MS * 4);
    expect(mockGetExecution).toHaveBeenCalledTimes(2);
    expect(result.current.workflowExecution?.status).toBe(status);
    expect(result.current.isLoading).toBe(false);
  });

  it.each(TerminalExecutionStatuses)(
    'stops after the first load of a %s execution',
    async (status) => {
      mockGetExecution.mockResolvedValue(createMockWorkflowExecution(status));
      renderPolling();
      await advance(WORKFLOW_EXECUTION_POLL_INTERVAL_MS * 4);
      expect(mockGetExecution).toHaveBeenCalledTimes(1);
    }
  );

  it('handles running, waiting, and completed transitions', async () => {
    mockGetExecution
      .mockResolvedValueOnce(createMockWorkflowExecution(ExecutionStatus.RUNNING))
      .mockResolvedValueOnce(createMockWorkflowExecution(ExecutionStatus.WAITING))
      .mockResolvedValue(createMockWorkflowExecution(ExecutionStatus.COMPLETED));
    const { result } = renderPolling();
    await advance();
    await advance(WORKFLOW_EXECUTION_POLL_INTERVAL_MS);
    expect(result.current.workflowExecution?.status).toBe(ExecutionStatus.WAITING);
    await advance(WORKFLOW_EXECUTION_POLL_INTERVAL_MS * 4);
    expect(result.current.workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(mockGetExecution).toHaveBeenCalledTimes(3);
  });

  it('restarts polling for another execution after a terminal result', async () => {
    mockGetExecution
      .mockResolvedValueOnce(createMockWorkflowExecution(ExecutionStatus.COMPLETED))
      .mockResolvedValue({ ...createMockWorkflowExecution(ExecutionStatus.RUNNING), id: 'exec-b' });
    const { result, rerender } = renderPolling();
    await advance();
    rerender({ executionId: 'exec-b' });
    expect(result.current.workflowExecution).toBeUndefined();
    await advance();
    await advance(WORKFLOW_EXECUTION_POLL_INTERVAL_MS);
    expect(mockGetExecution).toHaveBeenCalledTimes(3);
    expect(result.current.workflowExecution?.id).toBe('exec-b');
  });

  it('keeps B data and error state when A fails after B finishes', async () => {
    const response = Promise.withResolvers<WorkflowExecutionDto>();
    mockGetExecution.mockReturnValueOnce(response.promise).mockResolvedValue({
      ...createMockWorkflowExecution(ExecutionStatus.COMPLETED),
      id: 'exec-b',
    });
    const { result, rerender } = renderPolling();
    rerender({ executionId: 'exec-b' });
    await advance();
    await act(async () => response.reject(new Error('A failed')));

    expect(result.current.workflowExecution?.id).toBe('exec-b');
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(getMockServices(store).notifications.toasts.addError).not.toHaveBeenCalled();
  });

  it('exposes the current error and recovers on the next poll', async () => {
    mockGetExecution
      .mockRejectedValueOnce(new Error('Request failed'))
      .mockResolvedValue(createMockWorkflowExecution(ExecutionStatus.COMPLETED));
    const { result } = renderPolling();
    await advance();
    expect(result.current.error?.message).toBe('Request failed');
    expect(result.current.isLoading).toBe(false);
    await advance(WORKFLOW_EXECUTION_POLL_INTERVAL_MS);
    expect(result.current.error).toBeNull();
    expect(result.current.workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
  });

  it('retries final page failures before stopping polling', async () => {
    mockGetExecution.mockResolvedValue(createMockWorkflowExecution(ExecutionStatus.COMPLETED));
    mockGetExecutionSteps.mockRejectedValueOnce(new Error('Page failed'));
    const { result } = renderPolling();
    await advance();
    expect(result.current.workflowExecution).toBeUndefined();
    expect(result.current.error?.message).toBe('Page failed');
    await advance(WORKFLOW_EXECUTION_POLL_INTERVAL_MS * 3);
    expect(mockGetExecution).toHaveBeenCalledTimes(2);
    expect(result.current.workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.current.error).toBeNull();
  });

  it('stops polling and discards an in-flight result on unmount', async () => {
    const response = Promise.withResolvers<WorkflowExecutionDto>();
    mockGetExecution.mockReturnValue(response.promise);
    const { unmount } = renderPolling();
    unmount();
    await act(async () => response.resolve(createMockWorkflowExecution(ExecutionStatus.RUNNING)));
    await advance(WORKFLOW_EXECUTION_POLL_INTERVAL_MS * 3);
    expect(mockGetExecution).toHaveBeenCalledTimes(1);
    expect(store.getState().detail.execution).toBeUndefined();
  });
});
