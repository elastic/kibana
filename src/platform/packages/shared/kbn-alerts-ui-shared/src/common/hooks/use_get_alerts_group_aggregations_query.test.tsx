/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';

import { useGetAlertsGroupAggregationsQuery } from './use_get_alerts_group_aggregations_query';
import { waitFor, renderHook } from '@testing-library/react';
import { BASE_RAC_ALERTS_API_PATH } from '../constants';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

const mockNotifications = notificationServiceMock.createStartContract();

const { provider: wrapper } = createTestResponseOpsQueryClient({
  dependencies: {
    notifications: mockNotifications,
  },
});

const mockHttp = {
  post: jest.fn(),
};
const http = mockHttp as unknown as HttpStart;

const params = {
  ruleTypeIds: ['.es-query'],
  consumers: ['stackAlerts'],
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
          http,
        }),
      { wrapper }
    );

    await waitFor(() => expect(mockNotifications.toasts.addDanger).toHaveBeenCalled());
  });

  test('calls API endpoint with the correct body', async () => {
    renderHook(
      () =>
        useGetAlertsGroupAggregationsQuery({
          params,
          enabled: true,
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
