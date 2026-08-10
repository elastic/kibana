/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { QueryClient } from '@kbn/react-query';
import { ExecutionStatus } from '@kbn/workflows/types/v1';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { useLazyStepExecutionFetcher } from './use_lazy_step_execution_fetcher';
import { createMockStepExecutionDto } from '../../../../shared/test_utils/mock_workflow_factories';
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from '../../../../shared/test_utils/query_client_wrapper';

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: jest.fn(),
}));
const mockUseWorkflowsApi = useWorkflowsApi as jest.MockedFunction<typeof useWorkflowsApi>;

jest.mock('@kbn/workflows', () => ({
  isTerminalStatus: jest.fn((status: ExecutionStatus) =>
    ['completed', 'failed', 'skipped'].includes(status)
  ),
}));

describe('useLazyStepExecutionFetcher', () => {
  let mockGetStepExecution: jest.Mock;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockGetStepExecution = jest.fn();
    mockUseWorkflowsApi.mockReturnValue({
      getStepExecution: mockGetStepExecution,
    } as any);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when executionId is undefined', async () => {
    const { result } = renderHook(
      () => useLazyStepExecutionFetcher(undefined, [createMockStepExecutionDto()]),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    const data = await result.current.current('step-1');
    expect(data).toBeNull();
    expect(mockGetStepExecution).not.toHaveBeenCalled();
  });

  it('returns null when stepId is not found in stepExecutions', async () => {
    const { result } = renderHook(
      () =>
        useLazyStepExecutionFetcher('exec-1', [
          createMockStepExecutionDto({ stepId: 'other-step' }),
        ]),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    const data = await result.current.current('step-1');
    expect(data).toBeNull();
    expect(mockGetStepExecution).not.toHaveBeenCalled();
  });

  it('fetches from API when cache is empty', async () => {
    const apiResponse = {
      output: { result: 'ok' },
      error: null,
      input: { arg: 'value' },
      status: ExecutionStatus.COMPLETED,
      state: null,
    };
    mockGetStepExecution.mockResolvedValue(apiResponse);

    const { result } = renderHook(
      () => useLazyStepExecutionFetcher('exec-1', [createMockStepExecutionDto()]),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    const data = await result.current.current('step-1');

    expect(mockGetStepExecution).toHaveBeenCalledWith('exec-1', 'doc-1');
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
          createMockStepExecutionDto({ stepId: 'step-1', status: ExecutionStatus.COMPLETED }),
        ]),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    const data = await result.current.current('step-1');

    expect(mockGetStepExecution).not.toHaveBeenCalled();
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
    mockGetStepExecution.mockResolvedValue(freshData);

    const { result } = renderHook(
      () =>
        useLazyStepExecutionFetcher('exec-1', [
          createMockStepExecutionDto({ stepId: 'step-1', status: ExecutionStatus.RUNNING }),
        ]),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    const data = await result.current.current('step-1');

    expect(mockGetStepExecution).toHaveBeenCalled();
    expect(data).toEqual({
      output: freshData.output,
      error: freshData.error,
      input: freshData.input,
      status: freshData.status,
      state: freshData.state,
    });
  });

  it('returns null when the HTTP request fails', async () => {
    mockGetStepExecution.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useLazyStepExecutionFetcher('exec-1', [createMockStepExecutionDto()]),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    const data = await result.current.current('step-1');
    expect(data).toBeNull();
  });

  it('returns null when the HTTP response is falsy', async () => {
    mockGetStepExecution.mockResolvedValue(null);

    const { result } = renderHook(
      () => useLazyStepExecutionFetcher('exec-1', [createMockStepExecutionDto()]),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    const data = await result.current.current('step-1');
    expect(data).toBeNull();
  });
});
