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
import { renderHook, waitFor } from '@testing-library/react';
import { testQueryClientConfig } from '../test_utils/test_query_client_config';
import { useFetchFlappingSettings } from './use_fetch_flapping_settings';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: FunctionComponent<React.PropsWithChildren<{}>> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const http = httpServiceMock.createStartContract();

const now = new Date().toISOString();

describe('useFetchFlappingSettings', () => {
  beforeEach(() => {
    http.get.mockResolvedValue({
      created_by: 'test',
      updated_by: 'test',
      created_at: now,
      updated_at: now,
      enabled: true,
      look_back_window: 20,
      status_change_threshold: 20,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    queryClient.clear();
  });

  test('should call fetchFlappingSettings with the correct parameters', async () => {
    const { result } = renderHook(() => useFetchFlappingSettings({ http, enabled: true }), {
      wrapper,
    });

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(result.current.data).toEqual({
      createdAt: now,
      createdBy: 'test',
      updatedAt: now,
      updatedBy: 'test',
      enabled: true,
      lookBackWindow: 20,
      statusChangeThreshold: 20,
    });
  });

  test('should not call fetchFlappingSettings if enabled is false', async () => {
    const { result } = renderHook(() => useFetchFlappingSettings({ http, enabled: false }), {
      wrapper,
    });

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(http.get).not.toHaveBeenCalled();
  });

  test('should call onSuccess when the fetching was successful', async () => {
    const onSuccessMock = jest.fn();
    const { result } = renderHook(
      () => useFetchFlappingSettings({ http, enabled: true, onSuccess: onSuccessMock }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(onSuccessMock).toHaveBeenCalledWith({
      createdAt: now,
      createdBy: 'test',
      updatedAt: now,
      updatedBy: 'test',
      enabled: true,
      lookBackWindow: 20,
      statusChangeThreshold: 20,
    });
  });
});
