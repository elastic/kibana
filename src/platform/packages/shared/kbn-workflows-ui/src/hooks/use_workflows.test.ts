/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Subject } from 'rxjs';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { WorkflowListDto, WorkflowsSearchParams } from '@kbn/workflows';
import { useWorkflows } from './use_workflows';
import { createMockWorkflowApi } from '../api/workflows_api.mock';
import { testQueryClientConfig } from '../test_utils';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockWorkflowApi = createMockWorkflowApi();
const showManagedWorkflows$ = new Subject<boolean>();
const mockUiSettings = {
  get: jest.fn(),
  get$: jest.fn(() => showManagedWorkflows$.asObservable()),
};

jest.mock('../api/use_workflows_api', () => ({
  useWorkflowsApi: () => mockWorkflowApi,
}));

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useWorkflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    mockUiSettings.get.mockReturnValue(false);
    mockUiSettings.get$.mockReturnValue(showManagedWorkflows$.asObservable());
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        settings: {
          client: mockUiSettings,
        },
      },
    });
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

    mockWorkflowApi.getWorkflows.mockResolvedValue(mockData);

    const { result } = renderHook(() => useWorkflows(params), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockWorkflowApi.getWorkflows).toHaveBeenCalledWith(params);
    expect(result.current.data).toEqual(mockData);
  });

  it('includes managed workflows when the visibility setting is enabled', async () => {
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

    mockUiSettings.get.mockReturnValue(true);
    mockWorkflowApi.getWorkflows.mockResolvedValue(mockData);

    const { result } = renderHook(() => useWorkflows(params), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockWorkflowApi.getWorkflows).toHaveBeenCalledWith({ ...params, managed: 'all' });
  });

  it('refetches with managed workflows when the visibility setting changes', async () => {
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

    mockWorkflowApi.getWorkflows.mockResolvedValue(mockData);

    const { result } = renderHook(() => useWorkflows(params), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockWorkflowApi.getWorkflows).toHaveBeenCalledWith(params);

    act(() => {
      showManagedWorkflows$.next(true);
    });

    await waitFor(() => expect(mockWorkflowApi.getWorkflows).toHaveBeenCalledTimes(2));

    expect(mockWorkflowApi.getWorkflows).toHaveBeenLastCalledWith({ ...params, managed: 'all' });
  });

  it('preserves an explicit managed workflow filter', async () => {
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
      managed: 'unmanaged',
    };

    mockUiSettings.get.mockReturnValue(true);
    mockWorkflowApi.getWorkflows.mockResolvedValue(mockData);

    const { result } = renderHook(() => useWorkflows(params), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockWorkflowApi.getWorkflows).toHaveBeenCalledWith(params);
  });
});
