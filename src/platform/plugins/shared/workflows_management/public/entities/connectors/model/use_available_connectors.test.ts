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
  useAvailableConnectors,
  useConnectorInstances,
  useConnectorTypes,
  useFetchConnector,
} from './use_available_connectors';
import { useKibana } from '../../../hooks/use_kibana';
import { TestWrapper } from '../../../shared/test_utils';

jest.mock('../../../hooks/use_kibana');
jest.mock('@kbn/alerts-ui-shared/src/common/apis', () => ({
  fetchConnector: jest.fn(),
}));

const { fetchConnector: mockFetchConnector } = jest.requireMock(
  '@kbn/alerts-ui-shared/src/common/apis'
);
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const createQueryWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useAvailableConnectors', () => {
  it('should return connector data from Redux store', () => {
    const { result } = renderHook(() => useAvailableConnectors(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(TestWrapper, null, children),
    });

    // The initial Redux state has connectors as undefined
    expect(result.current).toBeUndefined();
  });
});

describe('useConnectorInstances', () => {
  it('should return instances for a given action type', () => {
    const { result } = renderHook(() => useConnectorInstances('.email'), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(TestWrapper, null, children),
    });

    // With default store state, no instances should be available
    expect(result.current).toEqual([]);
  });
});

describe('useConnectorTypes', () => {
  it('should return available connector types', () => {
    const { result } = renderHook(() => useConnectorTypes(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(TestWrapper, null, children),
    });

    // With default store state, it should return an empty array
    expect(result.current).toEqual([]);
  });
});

describe('useFetchConnector', () => {
  let queryClient: QueryClient;
  let mockHttp: { get: jest.Mock };

  const connectorResponse = {
    id: 'connector-1',
    actionTypeId: '.email',
    name: 'My Email Connector',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp = { get: jest.fn() };
    mockUseKibana.mockReturnValue({
      services: { http: mockHttp },
    } as any);
    mockFetchConnector.mockResolvedValue(connectorResponse);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch a connector when connectorId is provided', async () => {
    const { result } = renderHook(() => useFetchConnector('connector-1'), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetchConnector).toHaveBeenCalledWith('connector-1', {
      http: mockHttp,
    });
    expect(result.current.data).toEqual(connectorResponse);
  });

  it('should not fetch when connectorId is undefined', () => {
    const { result } = renderHook(() => useFetchConnector(undefined), {
      wrapper: createQueryWrapper(queryClient),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockFetchConnector).not.toHaveBeenCalled();
  });

  it('should handle errors from fetchConnector', async () => {
    mockFetchConnector.mockRejectedValue(new Error('Connector not found'));

    const { result } = renderHook(() => useFetchConnector('bad-id'), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });
});
