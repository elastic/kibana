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
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { useWorkflowExecution } from './use_workflow_execution';
import { testQueryClientConfig } from '../test_utils';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const queryClient = new QueryClient(testQueryClientConfig);
const mockCore = coreMock.createStart();
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useWorkflowExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    mockUseKibana.mockReturnValue({
      services: {
        http: mockCore.http,
      },
    } as any);
  });

  it('calls the API with correct endpoint', async () => {
    const mockData: WorkflowExecutionDto = {
      id: 'test-id',
      spaceId: 'default',
      status: 'completed' as any,
      startedAt: '2023-01-01T00:00:00Z',
      finishedAt: '2023-01-01T00:00:01Z',
      workflowId: 'workflow-id',
      workflowName: 'test-workflow',
      workflowDefinition: {
        version: '1',
        name: 'test-workflow',
        enabled: true,
        triggers: [{ type: 'manual' }],
        steps: [],
      },
      stepExecutions: [],
      triggeredBy: 'manual',
      yaml: '',
      duration: 1000,
    };

    mockCore.http.get.mockResolvedValue(mockData);

    const { result } = renderHook(() => useWorkflowExecution('test-id'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCore.http.get).toHaveBeenCalledWith('/api/workflowExecutions/test-id');
    expect(result.current.data).toEqual(mockData);
  });

  it('does not call API when workflowExecutionId is null', () => {
    renderHook(() => useWorkflowExecution(null), { wrapper });

    expect(mockCore.http.get).not.toHaveBeenCalled();
  });

  it('handles http service unavailable', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUseKibana.mockReturnValue({
      services: {
        http: null,
      },
    } as any);

    const { result } = renderHook(() => useWorkflowExecution('test-id'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Http service is not available');
  });
});
