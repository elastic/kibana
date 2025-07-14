/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import * as ReactQuery from '@tanstack/react-query';
import { waitFor, renderHook } from '@testing-library/react';
import { testQueryClientConfig } from '../test_utils/test_query_client_config';
import { useFetchAlertsFieldsNewApi } from './use_fetch_alerts_fields_new_api';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core/public/mocks';

const { QueryClient, QueryClientProvider } = ReactQuery;

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const useQuerySpy = jest.spyOn(ReactQuery, 'useQuery');

const mockHttpClient = httpServiceMock.createStartContract();
const mockToasts = notificationServiceMock.createStartContract().toasts;

const emptyData = { alertFields: {}, fields: [] };

describe('useFetchAlertsFieldsNewApi', () => {
  const mockHttpGet = jest.mocked(mockHttpClient.get);

  beforeEach(() => {
    mockHttpGet.mockResolvedValue({
      alertFields: { fakeCategory: {} },
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

  it('should return all fields when empty rule types', async () => {
    const { result } = renderHook(
      () =>
        useFetchAlertsFieldsNewApi({
          http: mockHttpClient,
          toasts: mockToasts,
          ruleTypeIds: [],
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(mockHttpGet).toHaveBeenCalledWith('/internal/rac/alerts/fields', {
        query: { ruleTypeIds: [] },
      });
    });

    expect(result.current.data).toEqual({
      alertFields: {
        fakeCategory: {},
      },
      fields: [
        {
          name: 'fakeCategory',
        },
      ],
    });
  });

  it('should fetch for single rule types', () => {
    const { result } = renderHook(
      () =>
        useFetchAlertsFieldsNewApi({
          http: mockHttpClient,
          toasts: mockToasts,
          ruleTypeIds: ['logs'],
        }),
      {
        wrapper,
      }
    );

    expect(mockHttpGet).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(emptyData);
  });

  it('should correctly override the `enabled` option', () => {
    const { rerender } = renderHook(
      ({
        ruleTypeIds,
        enabled,
      }: React.PropsWithChildren<{ ruleTypeIds: string[]; enabled?: boolean }>) =>
        useFetchAlertsFieldsNewApi(
          { http: mockHttpClient, toasts: mockToasts, ruleTypeIds },
          { enabled }
        ),
      {
        wrapper,
        initialProps: {
          ruleTypeIds: ['apm'],
          enabled: false,
        },
      }
    );

    expect(useQuerySpy).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));

    rerender({ ruleTypeIds: [], enabled: true });

    expect(useQuerySpy).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));

    rerender({ ruleTypeIds: ['apm'] });

    expect(useQuerySpy).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  it('should call the api only once', async () => {
    const { result, rerender } = renderHook(
      () =>
        useFetchAlertsFieldsNewApi({
          http: mockHttpClient,
          toasts: mockToasts,
          ruleTypeIds: ['apm'],
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual({
        alertFields: { fakeCategory: {} },
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
        alertFields: { fakeCategory: {} },
        fields: [
          {
            name: 'fakeCategory',
          },
        ],
      });
    });
  });

  it('should fetch for siem rule types', async () => {
    const { result } = renderHook(
      () =>
        useFetchAlertsFieldsNewApi({
          http: mockHttpClient,
          toasts: mockToasts,
          ruleTypeIds: ['siem.esqlRule', 'siem.eqlRule'],
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual({
        alertFields: { fakeCategory: {} },
        fields: [
          {
            name: 'fakeCategory',
          },
        ],
      });
    });
  });

  it('should show error toast on fetch failure', async () => {
    mockHttpGet.mockRejectedValue(new Error('Something went wrong'));

    const { result } = renderHook(
      () =>
        useFetchAlertsFieldsNewApi({
          http: mockHttpClient,
          toasts: mockToasts,
          ruleTypeIds: [],
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(1);

      expect(result.current.isError).toBe(true);
      expect(mockToasts.addDanger).toHaveBeenCalledWith('Unable to load alert fields');
    });
  });
});
