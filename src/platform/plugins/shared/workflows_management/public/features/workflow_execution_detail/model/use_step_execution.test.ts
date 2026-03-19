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
import { ExecutionStatus } from '@kbn/workflows';
import { useStepExecution } from './use_step_execution';
import { useKibana } from '../../../hooks/use_kibana';

jest.mock('../../../hooks/use_kibana');
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useStepExecution', () => {
  let mockHttpGet: jest.Mock;
  let queryClient: QueryClient;

  const stepResponse = {
    stepId: 'step-1',
    status: 'completed',
    input: { arg: 'value' },
    output: { result: 'ok' },
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockHttpGet = jest.fn().mockResolvedValue(stepResponse);
    mockUseKibana.mockReturnValue({
      services: { http: { get: mockHttpGet } },
    } as any);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    queryClient.clear();
  });

  it('should not fetch when stepExecutionId is undefined', () => {
    const { result } = renderHook(
      () => useStepExecution('exec-1', undefined, ExecutionStatus.COMPLETED),
      { wrapper: createWrapper(queryClient) }
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockHttpGet).not.toHaveBeenCalled();
  });

  it('should fetch when both IDs are provided', async () => {
    const { result } = renderHook(
      () => useStepExecution('exec-1', 'step-doc-1', ExecutionStatus.COMPLETED),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockHttpGet).toHaveBeenCalledWith('/api/workflowExecutions/exec-1/steps/step-doc-1');
    expect(result.current.data).toEqual(stepResponse);
  });

  it('should set staleTime to Infinity for terminal step status', async () => {
    const { result } = renderHook(
      () => useStepExecution('exec-1', 'step-doc-1', ExecutionStatus.COMPLETED),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cachedQuery = queryClient.getQueryCache().findAll({
      queryKey: ['stepExecution', 'exec-1', 'step-doc-1'],
    })[0];
    expect(cachedQuery.state.isInvalidated).toBe(false);
    expect(cachedQuery.state.dataUpdateCount).toBe(1);

    // After initial fetch, no refetch should happen even after the polling interval
    mockHttpGet.mockClear();
    jest.advanceTimersByTime(10_000);
    expect(mockHttpGet).not.toHaveBeenCalled();
  });

  it('should poll for non-terminal step status', async () => {
    const { result } = renderHook(
      () => useStepExecution('exec-1', 'step-doc-1', ExecutionStatus.RUNNING),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockHttpGet).toHaveBeenCalledTimes(1);

    // Advance past the 5s refetch interval — should trigger another fetch
    mockHttpGet.mockClear();
    jest.advanceTimersByTime(5_000);
    await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
  });

  it('should stop polling when step transitions to terminal status', async () => {
    const { result, rerender } = renderHook(
      ({ status }: { status: ExecutionStatus }) => useStepExecution('exec-1', 'step-doc-1', status),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { status: ExecutionStatus.RUNNING },
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Transition to terminal
    rerender({ status: ExecutionStatus.COMPLETED });

    mockHttpGet.mockClear();
    jest.advanceTimersByTime(15_000);
    expect(mockHttpGet).not.toHaveBeenCalled();
  });

  it('should use the correct query key structure', async () => {
    renderHook(() => useStepExecution('exec-1', 'step-doc-1', ExecutionStatus.COMPLETED), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryCache().findAll({
          queryKey: ['stepExecution', 'exec-1', 'step-doc-1'],
        })
      ).toHaveLength(1)
    );
  });
});
