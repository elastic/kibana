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
import { useQueryTriggerEvents } from './use_query_trigger_events';
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
});
