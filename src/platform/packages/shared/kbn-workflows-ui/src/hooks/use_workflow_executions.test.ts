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
import type { WorkflowExecutionListDto } from '@kbn/workflows';
import { useWorkflowExecutions } from './use_workflow_executions';
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

describe('useWorkflowExecutions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('searches with structured execution context parameters', async () => {
    const response = {
      results: [],
      page: 1,
      size: 25,
      total: 0,
    } as WorkflowExecutionListDto;
    mockWorkflowApi.searchExecutions.mockResolvedValue(response);

    const { result } = renderHook(
      () =>
        useWorkflowExecutions({
          executionContext: { type: 'cases.case', id: 'case-1' },
          statuses: [],
          page: 1,
          size: 25,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockWorkflowApi.searchExecutions).toHaveBeenCalledWith({
      contextType: 'cases.case',
      contextId: 'case-1',
      statuses: [],
      page: 1,
      size: 25,
    });
    expect(result.current.data).toEqual(response);
  });
});
