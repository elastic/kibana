/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ExecutionStatus, type WorkflowStepExecutionDto } from '@kbn/workflows/types/v1';
import { useLazyStepExecutionFetcher } from './use_lazy_step_execution_fetcher';
import { useKibana } from '../../../../hooks/use_kibana';

jest.mock('../../../../hooks/use_kibana');
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

jest.mock('@kbn/workflows', () => ({
  isTerminalStatus: jest.fn((status: ExecutionStatus) =>
    ['completed', 'failed', 'skipped'].includes(status)
  ),
}));

const createStepExecution = (
  overrides: Partial<WorkflowStepExecutionDto> = {}
): WorkflowStepExecutionDto => ({
  id: 'doc-1',
  stepId: 'step-1',
  stepType: 'action',
  scopeStack: [],
  workflowRunId: 'run-1',
  workflowId: 'wf-1',
  status: ExecutionStatus.COMPLETED,
  startedAt: '2024-01-01T00:00:00Z',
  topologicalIndex: 0,
  globalExecutionIndex: 0,
  stepExecutionIndex: 0,
  ...overrides,
});

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useLazyStepExecutionFetcher', () => {
  let mockHttpGet: jest.Mock;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockHttpGet = jest.fn();
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
    jest.clearAllMocks();
  });

  it('returns a ref to the fetcher function', () => {
    const { result } = renderHook(
      () => useLazyStepExecutionFetcher('exec-1', [createStepExecution()]),
      { wrapper: createWrapper(queryClient) }
    );

    expect(result.current).toBeDefined();
    expect(result.current.current).toBeInstanceOf(Function);
  });

  it('returns null when executionId is undefined', async () => {
    const { result } = renderHook(
      () => useLazyStepExecutionFetcher(undefined, [createStepExecution()]),
      { wrapper: createWrapper(queryClient) }
    );

    const data = await result.current.current('step-1');
    expect(data).toBeNull();
    expect(mockHttpGet).not.toHaveBeenCalled();
  });

  it('returns null when stepId is not found in stepExecutions', async () => {
    const { result } = renderHook(
      () => useLazyStepExecutionFetcher('exec-1', [createStepExecution({ stepId: 'other-step' })]),
      { wrapper: createWrapper(queryClient) }
    );

    const data = await result.current.current('step-1');
    expect(data).toBeNull();
    expect(mockHttpGet).not.toHaveBeenCalled();
  });

  it('fetches from API when cache is empty', async () => {
    const apiResponse = {
      output: { result: 'ok' },
      error: null,
      input: { arg: 'value' },
      status: ExecutionStatus.COMPLETED,
      state: null,
    };
    mockHttpGet.mockResolvedValue(apiResponse);

    const { result } = renderHook(
      () => useLazyStepExecutionFetcher('exec-1', [createStepExecution()]),
      { wrapper: createWrapper(queryClient) }
    );

    const data = await result.current.current('step-1');

    expect(mockHttpGet).toHaveBeenCalledWith('/api/workflowExecutions/exec-1/steps/doc-1');
    expect(data).toEqual({
      output: apiResponse.output,
      error: apiResponse.error,
      input: apiResponse.input,
      status: apiResponse.status,
      state: apiResponse.state,
    });
  });

  it('uses cached data for terminal steps', async () => {
    const cachedData = {
      output: { cached: true },
      error: null,
      input: {},
      status: ExecutionStatus.COMPLETED,
      state: null,
    };

    // Pre-populate the cache
    queryClient.setQueryData(['stepExecution', 'exec-1', 'doc-1'], cachedData);

    const { result } = renderHook(
      () =>
        useLazyStepExecutionFetcher('exec-1', [
          createStepExecution({ stepId: 'step-1', status: ExecutionStatus.COMPLETED }),
        ]),
      { wrapper: createWrapper(queryClient) }
    );

    const data = await result.current.current('step-1');

    expect(mockHttpGet).not.toHaveBeenCalled();
    expect(data).toEqual({
      output: cachedData.output,
      error: cachedData.error,
      input: cachedData.input,
      status: cachedData.status,
      state: cachedData.state,
    });
  });

  it('fetches fresh data for running steps even if cached', async () => {
    const cachedData = {
      output: null,
      error: null,
      input: {},
      status: 'running',
      state: null,
    };
    const freshData = {
      output: { fresh: true },
      error: null,
      input: {},
      status: 'running',
      state: null,
    };

    queryClient.setQueryData(['stepExecution', 'exec-1', 'doc-1'], cachedData);
    mockHttpGet.mockResolvedValue(freshData);

    const { result } = renderHook(
      () =>
        useLazyStepExecutionFetcher('exec-1', [
          createStepExecution({ stepId: 'step-1', status: ExecutionStatus.RUNNING }),
        ]),
      { wrapper: createWrapper(queryClient) }
    );

    const data = await result.current.current('step-1');

    expect(mockHttpGet).toHaveBeenCalled();
    expect(data).toEqual({
      output: freshData.output,
      error: freshData.error,
      input: freshData.input,
      status: freshData.status,
      state: freshData.state,
    });
  });

  it('returns null when the HTTP request fails', async () => {
    mockHttpGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useLazyStepExecutionFetcher('exec-1', [createStepExecution()]),
      { wrapper: createWrapper(queryClient) }
    );

    const data = await result.current.current('step-1');
    expect(data).toBeNull();
  });

  it('returns null when the HTTP response is falsy', async () => {
    mockHttpGet.mockResolvedValue(null);

    const { result } = renderHook(
      () => useLazyStepExecutionFetcher('exec-1', [createStepExecution()]),
      { wrapper: createWrapper(queryClient) }
    );

    const data = await result.current.current('step-1');
    expect(data).toBeNull();
  });
});
