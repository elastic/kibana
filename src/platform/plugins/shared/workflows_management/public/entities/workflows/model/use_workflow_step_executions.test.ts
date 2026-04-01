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
import { useWorkflowStepExecutions } from './use_workflow_step_executions';
import { createQueryClientWrapper, createTestQueryClient } from '../../../shared/test_utils';

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: jest.fn(),
}));

const mockUseWorkflowsApi = useWorkflowsApi as jest.MockedFunction<typeof useWorkflowsApi>;

describe('useWorkflowStepExecutions', () => {
  let mockGetWorkflowStepExecutions: jest.Mock;
  let queryClient: QueryClient;

  const stepExecutionsResponse = {
    results: [
      { id: 'step-1', stepId: 'fetch_data', status: 'completed' },
      { id: 'step-2', stepId: 'transform', status: 'running' },
    ],
    total: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWorkflowStepExecutions = jest.fn().mockResolvedValue(stepExecutionsResponse);
    mockUseWorkflowsApi.mockReturnValue({
      getWorkflowStepExecutions: mockGetWorkflowStepExecutions,
    } as any);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch step executions for a workflow', async () => {
    const { result } = renderHook(() => useWorkflowStepExecutions({ workflowId: 'wf-1' }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetWorkflowStepExecutions).toHaveBeenCalledWith('wf-1', {
      page: undefined,
      size: 100,
    });
    expect(result.current.data).toEqual(stepExecutionsResponse);
  });

  it('should not fetch when workflowId is null', () => {
    const { result } = renderHook(() => useWorkflowStepExecutions({ workflowId: null }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockGetWorkflowStepExecutions).not.toHaveBeenCalled();
  });

  it('should include stepId in query when provided', async () => {
    const { result } = renderHook(
      () => useWorkflowStepExecutions({ workflowId: 'wf-1', stepId: 'fetch_data' }),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetWorkflowStepExecutions).toHaveBeenCalledWith('wf-1', {
      stepId: 'fetch_data',
      page: undefined,
      size: 100,
    });
  });

  it('should pass page and size params when provided', async () => {
    const { result } = renderHook(
      () => useWorkflowStepExecutions({ workflowId: 'wf-1', page: 2, size: 50 }),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetWorkflowStepExecutions).toHaveBeenCalledWith('wf-1', {
      page: 2,
      size: 50,
    });
  });

  it('should handle HTTP errors', async () => {
    mockGetWorkflowStepExecutions.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useWorkflowStepExecutions({ workflowId: 'wf-1' }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });
});
