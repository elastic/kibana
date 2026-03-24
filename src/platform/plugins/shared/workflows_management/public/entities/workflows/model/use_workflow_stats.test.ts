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
import { useWorkflowFiltersOptions, useWorkflowStats } from './use_workflow_stats';
import { useKibana } from '../../../hooks/use_kibana';

jest.mock('../../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useWorkflowStats', () => {
  let mockHttpGet: jest.Mock;
  let queryClient: QueryClient;

  const statsResponse = {
    totalWorkflows: 10,
    enabledWorkflows: 7,
    totalExecutions: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpGet = jest.fn().mockResolvedValue(statsResponse);
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

  it('should fetch workflow stats', async () => {
    const { result } = renderHook(() => useWorkflowStats(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttpGet).toHaveBeenCalledWith('/api/workflows/stats');
    expect(result.current.data).toEqual(statsResponse);
  });

  it('should handle HTTP errors', async () => {
    mockHttpGet.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useWorkflowStats(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });
});

describe('useWorkflowFiltersOptions', () => {
  let mockHttpGet: jest.Mock;
  let queryClient: QueryClient;

  const aggsResponse = {
    status: [
      { label: 'active', checked: undefined },
      { label: 'inactive', checked: undefined },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpGet = jest.fn().mockResolvedValue(aggsResponse);
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

  it('should fetch filter options with the provided fields', async () => {
    const { result } = renderHook(() => useWorkflowFiltersOptions(['status']), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttpGet).toHaveBeenCalledWith('/api/workflows/aggs', {
      query: { fields: ['status'] },
    });
    expect(result.current.data).toEqual(aggsResponse);
  });
});
