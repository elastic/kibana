/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import { AlertConsumers } from '@kbn/rule-data-utils';
import * as ReactQuery from '@tanstack/react-query';
import { waitFor, renderHook } from '@testing-library/react';
import { testQueryClientConfig } from '../test_utils/test_query_client_config';
import { useFetchAlertsFieldsQuery } from './use_fetch_alerts_fields_query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

const { QueryClient, QueryClientProvider } = ReactQuery;

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const useQuerySpy = jest.spyOn(ReactQuery, 'useQuery');

const mockHttpClient = httpServiceMock.createStartContract();

const emptyData = { browserFields: {}, fields: [] };

describe('useFetchAlertsFieldsQuery', () => {
  const mockHttpGet = jest.mocked(mockHttpClient.get);

  beforeEach(() => {
    mockHttpGet.mockResolvedValue({
      browserFields: { fakeCategory: {} },
      fields: [
        {
          name: 'fakeCategory',
        },
      ],
    });
  });

  afterEach(() => {
    mockHttpGet.mockClear();
    queryClient.clear();
  });

  it('should not fetch for siem', () => {
    const { result } = renderHook(
      () => useFetchAlertsFieldsQuery({ http: mockHttpClient, featureIds: ['siem'] }),
      {
        wrapper,
      }
    );

    expect(mockHttpGet).toHaveBeenCalledTimes(0);
    expect(result.current.data).toEqual(emptyData);
  });

  it('should correctly override the `enabled` option', () => {
    const { rerender } = renderHook(
      ({
        featureIds,
        enabled,
      }: React.PropsWithChildren<{ featureIds: AlertConsumers[]; enabled?: boolean }>) =>
        useFetchAlertsFieldsQuery({ http: mockHttpClient, featureIds }, { enabled }),
      {
        wrapper,
        initialProps: {
          featureIds: ['apm'],
          enabled: false,
        },
      }
    );

    expect(useQuerySpy).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));

    rerender({ featureIds: [], enabled: true });

    expect(useQuerySpy).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));

    rerender({ featureIds: ['apm'] });

    expect(useQuerySpy).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  it('should call the api only once', async () => {
    const { result, rerender } = renderHook(
      () => useFetchAlertsFieldsQuery({ http: mockHttpClient, featureIds: ['apm'] }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual({
        browserFields: { fakeCategory: {} },
        fields: [
          {
            name: 'fakeCategory',
          },
        ],
      });
    });

    rerender();

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual({
        browserFields: { fakeCategory: {} },
        fields: [
          {
            name: 'fakeCategory',
          },
        ],
      });
    });
  });

  it('should not fetch if the only featureId is not valid', async () => {
    const { result } = renderHook(
      () =>
        useFetchAlertsFieldsQuery({
          http: mockHttpClient,
          featureIds: ['alerts'] as unknown as AlertConsumers[],
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(0);
      expect(result.current.data).toEqual(emptyData);
    });
  });

  it('should not fetch if all featureId are not valid', async () => {
    const { result } = renderHook(
      () =>
        useFetchAlertsFieldsQuery({
          http: mockHttpClient,
          featureIds: ['alerts', 'tomato'] as unknown as AlertConsumers[],
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(0);
      expect(result.current.data).toEqual(emptyData);
    });
  });

  it('should filter out the non valid feature id', async () => {
    renderHook(
      () =>
        useFetchAlertsFieldsQuery({
          http: mockHttpClient,
          featureIds: ['alerts', 'apm', 'logs'] as AlertConsumers[],
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(mockHttpGet).toHaveBeenCalledWith('/internal/rac/alerts/browser_fields', {
        query: { featureIds: ['apm', 'logs'] },
      });
    });
  });
});
