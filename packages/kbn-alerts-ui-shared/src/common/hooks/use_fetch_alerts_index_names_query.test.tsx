/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import type { HttpSetup } from '@kbn/core-http-browser';
import { testQueryClientConfig } from '../test_utils/test_query_client_config';
import { useFetchAlertsIndexNamesQuery } from './use_fetch_alerts_index_names_query';
import { fetchAlertsIndexNames } from '../apis/fetch_alerts_index_names';

jest.mock('../apis/fetch_alerts_index_names');

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: FunctionComponent = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockHttpClient = {
  get: jest.fn(),
} as unknown as HttpSetup;
const mockfetchAlertsIndexNames = jest.mocked(fetchAlertsIndexNames);

describe('useFetchAlertsIndexNamesQuery', () => {
  beforeEach(() => {
    mockfetchAlertsIndexNames.mockResolvedValue(['test-index']);
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('does not fetch if featureIds is empty', () => {
    renderHook(() => useFetchAlertsIndexNamesQuery({ http: mockHttpClient, featureIds: [] }), {
      wrapper,
    });

    expect(mockfetchAlertsIndexNames).not.toHaveBeenCalled();
  });

  it('calls fetchAlertsIndexNames with the correct parameters', () => {
    renderHook(() => useFetchAlertsIndexNamesQuery({ http: mockHttpClient, featureIds: ['apm'] }), {
      wrapper,
    });

    expect(mockfetchAlertsIndexNames).toHaveBeenCalledWith({
      http: mockHttpClient,
      featureIds: ['apm'],
    });
  });

  it('correctly caches the index names', async () => {
    const { result, rerender, waitForValueToChange } = renderHook(
      () => useFetchAlertsIndexNamesQuery({ http: mockHttpClient, featureIds: ['apm'] }),
      {
        wrapper,
      }
    );

    await waitForValueToChange(() => result.current.data);

    expect(mockfetchAlertsIndexNames).toHaveBeenCalledTimes(1);

    rerender();

    expect(mockfetchAlertsIndexNames).toHaveBeenCalledTimes(1);
  });
});
