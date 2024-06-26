/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks/dom';
import type { HttpStart } from '@kbn/core-http-browser';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { AlertConsumers } from '@kbn/rule-data-utils';

import { useGetAlertsGroupAggregationsQuery } from './use_get_alerts_group_aggregations_query';
import { waitFor } from '@testing-library/react';
import { BASE_RAC_ALERTS_API_PATH } from '../constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: Node }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockHttp = {
  post: jest.fn(),
};
const http = mockHttp as unknown as HttpStart;

const mockToasts = {
  addDanger: jest.fn(),
};
const toasts = mockToasts as unknown as ToastsStart;

const params = {
  featureIds: [AlertConsumers.STACK_ALERTS],
  groupByField: 'kibana.alert.rule.name',
};

describe('useAlertsGroupAggregationsQuery', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('displays toast on errors', async () => {
    mockHttp.post.mockRejectedValue(new Error('An error occurred'));
    renderHook(
      () =>
        useGetAlertsGroupAggregationsQuery({
          params,
          enabled: true,
          toasts,
          http,
        }),
      { wrapper }
    );

    await waitFor(() => expect(mockToasts.addDanger).toHaveBeenCalled());
  });

  test('calls API endpoint with the correct body', async () => {
    renderHook(
      () =>
        useGetAlertsGroupAggregationsQuery({
          params,
          enabled: true,
          toasts,
          http,
        }),
      { wrapper }
    );

    await waitFor(() =>
      expect(mockHttp.post).toHaveBeenLastCalledWith(
        `${BASE_RAC_ALERTS_API_PATH}/_group_aggregations`,
        {
          body: JSON.stringify(params),
        }
      )
    );
  });
});
