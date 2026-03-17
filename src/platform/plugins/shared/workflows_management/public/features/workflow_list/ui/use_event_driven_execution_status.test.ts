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
import { useEventDrivenExecutionStatus } from './use_event_driven_execution_status';
import { WORKFLOWS_CONFIG_PATH } from '../../../../common/routes';
import { useKibana } from '../../../hooks/use_kibana';

jest.mock('../../../hooks/use_kibana');
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useEventDrivenExecutionStatus', () => {
  let mockHttpGet: jest.Mock;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockHttpGet = jest.fn();
    mockUseKibana.mockReturnValue({
      services: { http: { get: mockHttpGet } },
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

  it('calls GET /internal/workflows/config and returns eventDrivenExecutionEnabled from response', async () => {
    mockHttpGet.mockResolvedValue({ eventDrivenExecutionEnabled: true });

    const { result } = renderHook(() => useEventDrivenExecutionStatus(), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockHttpGet).toHaveBeenCalledWith(WORKFLOWS_CONFIG_PATH);
    expect(result.current.eventDrivenExecutionEnabled).toBe(true);
    expect(result.current.error).toBe(false);
  });

  it('returns eventDrivenExecutionEnabled false when API returns false', async () => {
    mockHttpGet.mockResolvedValue({ eventDrivenExecutionEnabled: false });

    const { result } = renderHook(() => useEventDrivenExecutionStatus(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.eventDrivenExecutionEnabled).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('sets error to true and defaults eventDrivenExecutionEnabled to true on request failure', async () => {
    mockHttpGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useEventDrivenExecutionStatus(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe(true);
    expect(result.current.eventDrivenExecutionEnabled).toBe(true);
  });

  it('sets error to true when http is undefined (queryFn throws)', async () => {
    mockUseKibana.mockReturnValue({
      services: { http: undefined },
    } as any);

    const { result } = renderHook(() => useEventDrivenExecutionStatus(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockHttpGet).not.toHaveBeenCalled();
    expect(result.current.error).toBe(true);
    expect(result.current.eventDrivenExecutionEnabled).toBe(true);
  });
});
