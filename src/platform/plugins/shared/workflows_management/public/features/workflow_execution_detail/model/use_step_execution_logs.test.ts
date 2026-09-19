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
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { useStepExecutionLogs } from './use_step_execution_logs';

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: jest.fn(),
}));
const mockUseWorkflowsApi = useWorkflowsApi as jest.MockedFunction<typeof useWorkflowsApi>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useStepExecutionLogs', () => {
  let mockGetExecutionLogs: jest.Mock;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockGetExecutionLogs = jest.fn().mockResolvedValue({
      logs: [{ id: '1', timestamp: '2026-09-18T00:00:00.000Z', level: 'info', message: 'hi' }],
      total: 1,
      page: 1,
      size: 100,
    });
    mockUseWorkflowsApi.mockReturnValue({
      getExecutionLogs: mockGetExecutionLogs,
    } as any);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useStepExecutionLogs('exec-1', 'step-1', false), {
      wrapper: createWrapper(queryClient),
    });
    expect(mockGetExecutionLogs).not.toHaveBeenCalled();
  });

  it('does not fetch without a step execution id', () => {
    renderHook(() => useStepExecutionLogs('exec-1', undefined, true), {
      wrapper: createWrapper(queryClient),
    });
    expect(mockGetExecutionLogs).not.toHaveBeenCalled();
  });

  it('fetches logs for a step execution', async () => {
    const { result } = renderHook(() => useStepExecutionLogs('exec-1', 'step-1', true), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetExecutionLogs).toHaveBeenCalledWith('exec-1', {
      stepExecutionId: 'step-1',
      size: 100,
      page: 1,
      sortField: 'timestamp',
      sortOrder: 'asc',
    });
    expect(result.current.data?.logs).toHaveLength(1);
  });
});
