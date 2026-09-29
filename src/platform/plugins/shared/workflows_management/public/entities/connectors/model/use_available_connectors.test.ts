/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';
import type { QueryClient } from '@kbn/react-query';
import { useFetchConnector } from './use_available_connectors';
import { useKibana } from '../../../hooks/use_kibana';
import { createStartServicesMock, createUseKibanaMockValue } from '../../../mocks';
import { createQueryClientWrapper, createTestQueryClient } from '../../../shared/test_utils';

vi.mock('../../../hooks/use_kibana');
vi.mock('@kbn/alerts-ui-shared/src/common/apis', () => {
      const mocked = {
      fetchConnector: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const { fetchConnector: mockFetchConnector } = (await vi.importMock('@kbn/alerts-ui-shared/src/common/apis'));
const mockUseKibana = useKibana as MockedFunction<typeof useKibana>;

describe('useFetchConnector', () => {
  let queryClient: QueryClient;
  let services: ReturnType<typeof createStartServicesMock>;

  const connectorResponse = {
    id: 'connector-1',
    actionTypeId: '.email',
    name: 'My Email Connector',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    services = createStartServicesMock();
    mockUseKibana.mockReturnValue(createUseKibanaMockValue(services));
    mockFetchConnector.mockResolvedValue(connectorResponse);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch a connector when connectorId is provided', async () => {
    const { result } = renderHook(() => useFetchConnector('connector-1'), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetchConnector).toHaveBeenCalledWith('connector-1', {
      http: services.http,
    });
    expect(result.current.data).toEqual(connectorResponse);
  });

  it('should not fetch when connectorId is undefined', () => {
    const { result } = renderHook(() => useFetchConnector(undefined), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockFetchConnector).not.toHaveBeenCalled();
  });

  it('should handle errors from fetchConnector', async () => {
    mockFetchConnector.mockRejectedValue(new Error('Connector not found'));

    const { result } = renderHook(() => useFetchConnector('bad-id'), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });

  it('should not fetch when connectorId is an empty string', () => {
    const { result } = renderHook(() => useFetchConnector(''), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockFetchConnector).not.toHaveBeenCalled();
  });
});
