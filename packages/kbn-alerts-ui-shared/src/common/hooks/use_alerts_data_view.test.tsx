/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks/dom';
import { DataView } from '@kbn/data-views-plugin/common';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { fetchAlertsIndexNames } from '../apis/fetch_alerts_index_names';
import { fetchAlertsFields } from '../apis/fetch_alerts_fields';
import { testQueryClientConfig } from '../test_utils/test_query_client_config';
import { useAlertsDataView } from './use_alerts_data_view';

jest.mock('../apis/fetch_alerts_index_names');
const mockFetchAlertsIndexNames = jest
  .mocked(fetchAlertsIndexNames)
  .mockResolvedValue([
    '.alerts-observability.uptime.alerts-*',
    '.alerts-observability.metrics.alerts-*',
    '.alerts-observability.logs.alerts-*',
    '.alerts-observability.apm.alerts-*',
  ]);

jest.mock('../apis/fetch_alerts_fields');
const mockFetchAlertsFields = jest
  .mocked(fetchAlertsFields)
  .mockResolvedValue({ browserFields: {}, fields: [] });

const mockDataView = { fields: [] } as unknown as DataView;

const mockServices = {
  http: httpServiceMock.createStartContract(),
  toasts: notificationServiceMock.createStartContract().toasts,
  dataViewsService: dataViewPluginMocks.createStartContract(),
};
mockServices.dataViewsService.create.mockResolvedValue(mockDataView);

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useAlertsDataView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('starts with a loading state and without data', async () => {
    const mockedAsyncDataView = {
      isLoading: true,
      dataView: undefined,
    };

    const { result, waitFor } = renderHook(
      () =>
        useAlertsDataView({
          ...mockServices,
          ruleTypeIds: ['apm'],
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => expect(result.current).toEqual(mockedAsyncDataView));
  });

  it('fetches indexes and fields for non-siem feature ids, returning a DataViewBase object', async () => {
    const { result, waitForValueToChange } = renderHook(
      () =>
        useAlertsDataView({
          ...mockServices,
          ruleTypeIds: ['apm, .es-query'],
        }),
      {
        wrapper,
      }
    );

    await waitForValueToChange(() => result.current.isLoading, { timeout: 5000 });

    expect(mockFetchAlertsFields).toHaveBeenCalledTimes(1);
    expect(mockFetchAlertsIndexNames).toHaveBeenCalledTimes(1);
    expect(result.current.dataView).not.toBe(mockDataView);
  });

  it('only fetches index names for the siem feature id, returning a DataView', async () => {
    const { result, waitFor } = renderHook(
      () => useAlertsDataView({ ...mockServices, ruleTypeIds: ['siem.esqlRule', 'siem.eqlRule'] }),
      {
        wrapper,
      }
    );

    await waitFor(() => expect(mockFetchAlertsIndexNames).toHaveBeenCalledTimes(1));
    expect(mockFetchAlertsFields).toHaveBeenCalledTimes(0);

    await waitFor(() => expect(result.current.dataView).toBe(mockDataView));
  });

  it('does not fetch anything if siem and other feature ids are mixed together', async () => {
    const { result, waitFor } = renderHook(
      () =>
        useAlertsDataView({
          ...mockServices,
          ruleTypeIds: ['siem.esqlRule', 'apm', 'logs'],
        }),
      {
        wrapper,
      }
    );

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        dataView: undefined,
      })
    );
    expect(mockFetchAlertsIndexNames).toHaveBeenCalledTimes(0);
    expect(mockFetchAlertsFields).toHaveBeenCalledTimes(0);
  });

  it('returns an undefined data view if any of the queries fails', async () => {
    mockFetchAlertsIndexNames.mockRejectedValue('error');

    const { result, waitFor } = renderHook(
      () => useAlertsDataView({ ...mockServices, ruleTypeIds: ['.es-query'] }),
      {
        wrapper,
      }
    );

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        dataView: undefined,
      })
    );
  });

  it('shows an error toast if any of the queries fails', async () => {
    mockFetchAlertsIndexNames.mockRejectedValue('error');

    const { waitFor } = renderHook(
      () => useAlertsDataView({ ...mockServices, ruleTypeIds: ['.es-query'] }),
      {
        wrapper,
      }
    );

    await waitFor(() => expect(mockServices.toasts.addDanger).toHaveBeenCalled());
  });
});
