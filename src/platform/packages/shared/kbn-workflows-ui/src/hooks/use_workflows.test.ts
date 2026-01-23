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
import { coreMock } from '@kbn/core/public/mocks';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { WorkflowListDto, WorkflowsSearchParams } from '@kbn/workflows';
import { useWorkflows } from './use_workflows';
import { testQueryClientConfig } from '../test_utils';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const queryClient = new QueryClient(testQueryClientConfig);
const mockCore = coreMock.createStart();
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useWorkflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    mockUseKibana.mockReturnValue({
      services: {
        http: mockCore.http,
      },
    } as any);
  });

  it('calls the API with correct params', async () => {
    const mockData: WorkflowListDto = {
      results: [],
      page: 1,
      size: 10,
      total: 0,
    };

    const params: WorkflowsSearchParams = {
      page: 1,
      size: 10,
      query: 'test',
    };

    mockCore.http.post.mockResolvedValue(mockData);

    const { result } = renderHook(() => useWorkflows(params), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCore.http.post).toHaveBeenCalledWith('/api/workflows/search', {
      body: JSON.stringify(params),
    });
    expect(result.current.data).toEqual(mockData);
  });

  it('handles http service unavailable', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUseKibana.mockReturnValue({
      services: {
        http: null,
      },
    } as any);

    const params: WorkflowsSearchParams = { page: 1, size: 10 };
    const { result } = renderHook(() => useWorkflows(params), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error)?.message).toBe('Http service is not available');
  });
});
