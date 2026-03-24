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
import { useWorkflowExecution } from './use_workflow_execution';
import { useKibana } from '../../../hooks/use_kibana';

jest.mock('../../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useWorkflowExecution', () => {
  let mockHttpGet: jest.Mock;
  let queryClient: QueryClient;

  const executionResponse = {
    id: 'exec-1',
    workflowId: 'wf-1',
    status: 'completed',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpGet = jest.fn().mockResolvedValue(executionResponse);
    mockUseKibana.mockReturnValue({
      services: { http: { get: mockHttpGet } },
    } as any);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch execution data when executionId is provided', async () => {
    const { result } = renderHook(() => useWorkflowExecution({ executionId: 'exec-1' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttpGet).toHaveBeenCalledWith('/api/workflowExecutions/exec-1', { query: {} });
    expect(result.current.data).toEqual(executionResponse);
  });

  it('should not fetch when executionId is null', () => {
    const { result } = renderHook(() => useWorkflowExecution({ executionId: null }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockHttpGet).not.toHaveBeenCalled();
  });

  it('should not fetch when enabled is false', () => {
    const { result } = renderHook(
      () => useWorkflowExecution({ executionId: 'exec-1', enabled: false }),
      { wrapper: createWrapper(queryClient) }
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockHttpGet).not.toHaveBeenCalled();
  });

  it('should pass includeInput and includeOutput as query params', async () => {
    const { result } = renderHook(
      () =>
        useWorkflowExecution({
          executionId: 'exec-1',
          includeInput: true,
          includeOutput: false,
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttpGet).toHaveBeenCalledWith('/api/workflowExecutions/exec-1', {
      query: { includeInput: true, includeOutput: false },
    });
  });

  it('should handle HTTP errors', async () => {
    mockHttpGet.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useWorkflowExecution({ executionId: 'exec-1' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });
});
