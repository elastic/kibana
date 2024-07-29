/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import type { HttpSetup } from '@kbn/core-http-browser';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import { testQueryClientConfig } from '../test_utils/test_query_client_config';
import { useFetchAlertsFieldsQuery } from './use_fetch_alerts_fields_query';

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: FunctionComponent = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockHttpClient = {
  get: jest.fn(),
} as unknown as HttpSetup;

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

  it('should call the api only once', async () => {
    const { result, rerender, waitForValueToChange } = renderHook(
      () => useFetchAlertsFieldsQuery({ http: mockHttpClient, featureIds: ['apm'] }),
      {
        wrapper,
      }
    );

    await waitForValueToChange(() => result.current.data);

    expect(mockHttpGet).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({
      browserFields: { fakeCategory: {} },
      fields: [
        {
          name: 'fakeCategory',
        },
      ],
    });

    rerender();

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

    expect(mockHttpGet).toHaveBeenCalledTimes(0);
    expect(result.current.data).toEqual(emptyData);
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

    expect(mockHttpGet).toHaveBeenCalledTimes(0);
    expect(result.current.data).toEqual(emptyData);
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

    expect(mockHttpGet).toHaveBeenCalledTimes(1);
    expect(mockHttpGet).toHaveBeenCalledWith('/internal/rac/alerts/browser_fields', {
      query: { featureIds: ['apm', 'logs'] },
    });
  });
});
