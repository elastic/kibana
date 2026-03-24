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
import { useWorkflowExecution } from './use_workflow_execution';
import { useKibana } from '../../../hooks/use_kibana';
import { createStartServicesMock, createUseKibanaMockValue } from '../../../mocks';
import { createQueryClientWrapper, createTestQueryClient } from '../../../shared/test_utils';

jest.mock('../../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

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
    const services = createStartServicesMock();
    mockHttpGet = jest.fn().mockResolvedValue(executionResponse);
    (services.http.get as jest.Mock) = mockHttpGet;
    mockUseKibana.mockReturnValue(createUseKibanaMockValue(services));
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

    expect(mockHttpGet).toHaveBeenCalledWith('/api/workflowExecutions/exec-1', { query: {} });
    expect(result.current.data).toEqual(executionResponse);
  });

  it('should not fetch when executionId is null', () => {
    const { result } = renderHook(() => useWorkflowExecution({ executionId: null }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockHttpGet).not.toHaveBeenCalled();
  });

  it('should not fetch when enabled is false', () => {
    const { result } = renderHook(
      () => useWorkflowExecution({ executionId: 'exec-1', enabled: false }),
      { wrapper: createQueryClientWrapper(queryClient) }
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
      { wrapper: createQueryClientWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttpGet).toHaveBeenCalledWith('/api/workflowExecutions/exec-1', {
      query: { includeInput: true, includeOutput: false },
    });
  });

  it('should handle HTTP errors', async () => {
    mockHttpGet.mockRejectedValue(new Error('Not found'));

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

    const query = mockHttpGet.mock.calls[0][1].query;
    // undefined should NOT appear in query (source uses `!= null`)
    expect(query).not.toHaveProperty('includeInput');
    // false should appear (it is not null/undefined)
    expect(query).toHaveProperty('includeOutput', false);
  });
});
