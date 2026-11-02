/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { QueryClient } from '@kbn/react-query';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { useWorkflowExecution } from './use_workflow_execution';
import { createQueryClientWrapper, createTestQueryClient } from '../../../shared/test_utils';

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: jest.fn(),
}));

const mockUseWorkflowsApi = useWorkflowsApi as jest.MockedFunction<typeof useWorkflowsApi>;

describe('useWorkflowExecution', () => {
  let mockGetExecution: jest.Mock;
  let queryClient: QueryClient;

  const executionResponse = {
    id: 'exec-1',
    workflowId: 'wf-1',
    status: 'completed',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetExecution = jest.fn().mockResolvedValue(executionResponse);
    mockUseWorkflowsApi.mockReturnValue({
      getExecution: mockGetExecution,
    } as any);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch execution data when executionId is provided', async () => {
    const { result } = renderHook(() => useWorkflowExecution({ executionId: 'exec-1' }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetExecution).toHaveBeenCalledWith('exec-1', {
      includeInput: undefined,
      includeOutput: undefined,
    });
    expect(result.current.data).toEqual(executionResponse);
  });

  it('should not fetch when executionId is null', () => {
    const { result } = renderHook(() => useWorkflowExecution({ executionId: null }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockGetExecution).not.toHaveBeenCalled();
  });

  it('should not fetch when enabled is false', () => {
    const { result } = renderHook(
      () => useWorkflowExecution({ executionId: 'exec-1', enabled: false }),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockGetExecution).not.toHaveBeenCalled();
  });

  it('should pass includeInput and includeOutput as query params', async () => {
    const { result } = renderHook(
      () =>
        useWorkflowExecution({
          executionId: 'exec-1',
          includeInput: true,
          includeOutput: false,
        }),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetExecution).toHaveBeenCalledWith('exec-1', {
      includeInput: true,
      includeOutput: false,
    });
  });

  it('should handle HTTP errors', async () => {
    mockGetExecution.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useWorkflowExecution({ executionId: 'exec-1' }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });

  it('should exclude includeInput from query when undefined but include when false', async () => {
    const { result } = renderHook(
      () =>
        useWorkflowExecution({
          executionId: 'exec-1',
          includeInput: undefined,
          includeOutput: false,
        }),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetExecution).toHaveBeenCalledWith('exec-1', {
      includeInput: undefined,
      includeOutput: false,
    });
  });
});
