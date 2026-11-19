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
import {
  getWorkflowTriggerEventsLogQueryKey,
  useQueryTriggerEvents,
} from './use_query_trigger_events';
import type { SearchTriggerEventLogResult } from '../api/types';
import { createMockWorkflowApi } from '../api/workflows_api.mock';
import { testQueryClientConfig } from '../test_utils';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockWorkflowApi = createMockWorkflowApi();
jest.mock('../api/use_workflows_api', () => ({
  useWorkflowsApi: () => mockWorkflowApi,
}));

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('getWorkflowTriggerEventsLogQueryKey', () => {
  it('returns the same key for equivalent param objects', () => {
    const paramsA = {
      page: 1,
      size: 10,
      from: '2025-01-01',
      to: '2025-01-02',
      kql: 'triggerId: foo',
    };
    const paramsB = {
      kql: 'triggerId: foo',
      from: '2025-01-01',
      to: '2025-01-02',
      page: 1,
      size: 10,
    };

    expect(getWorkflowTriggerEventsLogQueryKey(paramsA)).toEqual(
      getWorkflowTriggerEventsLogQueryKey(paramsB)
    );
  });

  it('omits optional fields as undefined in the key tuple', () => {
    expect(getWorkflowTriggerEventsLogQueryKey({ page: 2, size: 50 })).toEqual([
      'workflowTriggerEventsLog',
      undefined,
      undefined,
      undefined,
      2,
      50,
    ]);
  });
});

describe('useQueryTriggerEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('calls searchTriggerEvents with correct params', async () => {
    const mockData: SearchTriggerEventLogResult = {
      hits: [],
      total: 0,
      page: 1,
      size: 10,
    };
    const params = { page: 1, size: 10, from: '2025-01-01' };
    mockWorkflowApi.searchTriggerEvents.mockResolvedValue(mockData);

    const { result } = renderHook(() => useQueryTriggerEvents(params), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockWorkflowApi.searchTriggerEvents).toHaveBeenCalledWith(params);
    expect(result.current.data).toEqual(mockData);
  });

  it('does not refetch when params object identity changes but values are unchanged', async () => {
    const mockData: SearchTriggerEventLogResult = {
      hits: [],
      total: 0,
      page: 1,
      size: 10,
    };
    mockWorkflowApi.searchTriggerEvents.mockResolvedValue(mockData);

    const initialParams = { page: 1, size: 10, from: '2025-01-01', to: '2025-01-02' };
    const { result, rerender } = renderHook(
      ({ params }: { params: typeof initialParams }) => useQueryTriggerEvents(params),
      { wrapper, initialProps: { params: initialParams } }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockWorkflowApi.searchTriggerEvents).toHaveBeenCalledTimes(1);

    rerender({ params: { ...initialParams } });

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(mockWorkflowApi.searchTriggerEvents).toHaveBeenCalledTimes(1);
  });
});
