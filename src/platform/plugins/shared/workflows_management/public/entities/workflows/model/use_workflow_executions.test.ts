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
import { ExecutionStatus, ExecutionType } from '@kbn/workflows/types/v1';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { useWorkflowExecutions } from './use_workflow_executions';
import { createQueryClientWrapper, createTestQueryClient } from '../../../shared/test_utils';

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: jest.fn(),
}));

const mockUseWorkflowsApi = useWorkflowsApi as jest.MockedFunction<typeof useWorkflowsApi>;

describe('useWorkflowExecutions', () => {
  let mockGetWorkflowExecutions: jest.Mock;
  let queryClient: QueryClient;

  const executionsPage1 = {
    results: [
      { id: 'exec-1', status: 'completed' },
      { id: 'exec-2', status: 'running' },
    ],
    page: 1,
    size: 100,
    total: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWorkflowExecutions = jest.fn().mockResolvedValue(executionsPage1);
    mockUseWorkflowsApi.mockReturnValue({
      getWorkflowExecutions: mockGetWorkflowExecutions,
    } as any);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch executions for a workflow', async () => {
    const { result } = renderHook(() => useWorkflowExecutions({ workflowId: 'wf-1' }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    expect(mockGetWorkflowExecutions).toHaveBeenCalledWith(
      'wf-1',
      expect.objectContaining({
        page: 1,
        size: 100,
      })
    );
  });

  it('should not fetch when workflowId is null', () => {
    renderHook(() => useWorkflowExecutions({ workflowId: null }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    expect(mockGetWorkflowExecutions).not.toHaveBeenCalled();
  });

  it('should flatten pages into allExecutions data', async () => {
    const { result } = renderHook(() => useWorkflowExecutions({ workflowId: 'wf-1' }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    expect(result.current.data).toEqual({
      results: [
        { id: 'exec-1', status: 'completed' },
        { id: 'exec-2', status: 'running' },
      ],
      page: 1,
      size: 100,
      total: 2,
    });
  });

  it('should pass statuses filter to query params', async () => {
    const statuses: ExecutionStatus[] = [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED];

    const { result } = renderHook(() => useWorkflowExecutions({ workflowId: 'wf-1', statuses }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    expect(mockGetWorkflowExecutions).toHaveBeenCalledWith(
      'wf-1',
      expect.objectContaining({
        statuses,
      })
    );
  });

  it('should pass executionTypes filter to query params', async () => {
    const executionTypes: ExecutionType[] = [ExecutionType.TEST];

    const { result } = renderHook(
      () => useWorkflowExecutions({ workflowId: 'wf-1', executionTypes }),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    expect(mockGetWorkflowExecutions).toHaveBeenCalledWith(
      'wf-1',
      expect.objectContaining({
        executionTypes,
      })
    );
  });

  it('should pass executedBy filter when it has entries', async () => {
    const { result } = renderHook(
      () =>
        useWorkflowExecutions({
          workflowId: 'wf-1',
          executedBy: ['user-1'],
        }),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    expect(mockGetWorkflowExecutions).toHaveBeenCalledWith(
      'wf-1',
      expect.objectContaining({
        executedBy: ['user-1'],
      })
    );
  });

  it('should not include executedBy when the array is empty', async () => {
    const { result } = renderHook(
      () =>
        useWorkflowExecutions({
          workflowId: 'wf-1',
          executedBy: [],
        }),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    const callParams = mockGetWorkflowExecutions.mock.calls[0][1];
    expect(callParams).not.toHaveProperty('executedBy');
  });

  it('should pass omitStepRuns when provided', async () => {
    const { result } = renderHook(
      () =>
        useWorkflowExecutions({
          workflowId: 'wf-1',
          omitStepRuns: true,
        }),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    expect(mockGetWorkflowExecutions).toHaveBeenCalledWith(
      'wf-1',
      expect.objectContaining({
        omitStepRuns: true,
      })
    );
  });

  it('should use custom page size when provided', async () => {
    const { result } = renderHook(() => useWorkflowExecutions({ workflowId: 'wf-1', size: 25 }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    expect(mockGetWorkflowExecutions).toHaveBeenCalledWith(
      'wf-1',
      expect.objectContaining({
        size: 25,
      })
    );
  });

  it('should return null data when there are no pages', () => {
    const { result } = renderHook(() => useWorkflowExecutions({ workflowId: null }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    expect(result.current.data).toBeNull();
  });

  it('should handle HTTP errors', async () => {
    mockGetWorkflowExecutions.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(
      () => useWorkflowExecutions({ workflowId: 'wf-1' }, { retry: false }),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('should expose hasNextPage as false when all results fit in one page', async () => {
    const { result } = renderHook(() => useWorkflowExecutions({ workflowId: 'wf-1' }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
  });

  it('should expose hasNextPage as true when total exceeds page size', async () => {
    mockGetWorkflowExecutions.mockResolvedValue({
      results: [{ id: 'exec-1', status: 'completed' }],
      page: 1,
      size: 1,
      total: 3,
    });

    const { result } = renderHook(() => useWorkflowExecutions({ workflowId: 'wf-1', size: 1 }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    expect(result.current.hasNextPage).toBe(true);
  });
});
