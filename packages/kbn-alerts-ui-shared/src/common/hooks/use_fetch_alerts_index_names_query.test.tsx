/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FunctionComponent } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor, renderHook } from '@testing-library/react';
import { testQueryClientConfig } from '../test_utils/test_query_client_config';
import { useFetchAlertsIndexNamesQuery } from './use_fetch_alerts_index_names_query';
import { fetchAlertsIndexNames } from '../apis/fetch_alerts_index_names';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

jest.mock('../apis/fetch_alerts_index_names');

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: FunctionComponent<React.PropsWithChildren<{}>> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockHttpClient = httpServiceMock.createStartContract();
const mockFetchAlertsIndexNames = jest.mocked(fetchAlertsIndexNames);

describe('useFetchAlertsIndexNamesQuery', () => {
  beforeEach(() => {
    mockFetchAlertsIndexNames.mockResolvedValue(['test-index']);
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('does not fetch if ruleTypeIds is empty', () => {
    renderHook(() => useFetchAlertsIndexNamesQuery({ http: mockHttpClient, ruleTypeIds: [] }), {
      wrapper,
    });

    expect(mockFetchAlertsIndexNames).not.toHaveBeenCalled();
  });

  it('calls fetchAlertsIndexNames with the correct parameters', () => {
    renderHook(
      () => useFetchAlertsIndexNamesQuery({ http: mockHttpClient, ruleTypeIds: ['apm'] }),
      {
        wrapper,
      }
    );

    expect(mockFetchAlertsIndexNames).toHaveBeenCalledWith({
      http: mockHttpClient,
      ruleTypeIds: ['apm'],
    });
  });

  it('correctly caches the index names', async () => {
    const { result, rerender } = renderHook(
      () => useFetchAlertsIndexNamesQuery({ http: mockHttpClient, ruleTypeIds: ['apm'] }),
      {
        wrapper,
      }
    );

    await waitFor(() => result.current.data);

    expect(mockFetchAlertsIndexNames).toHaveBeenCalledTimes(1);

    rerender();

    expect(mockFetchAlertsIndexNames).toHaveBeenCalledTimes(1);
  });
});
