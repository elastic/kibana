/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { testQueryClientConfig } from '../test_utils/test_query_client_config';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { useFindAlertsQuery } from './use_find_alerts_query';

describe('useFindAlertsQuery', () => {
  const mockServices = {
    http: httpServiceMock.createStartContract(),
    toasts: notificationServiceMock.createStartContract().toasts,
  };

  const queryClient = new QueryClient(testQueryClientConfig);

  const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the api correctly', async () => {
    const { result, waitForValueToChange } = renderHook(
      () =>
        useFindAlertsQuery({
          ...mockServices,
          params: { ruleTypeIds: ['foo'], consumers: ['bar'] },
        }),
      {
        wrapper,
      }
    );

    await waitForValueToChange(() => result.current.isLoading, { timeout: 5000 });

    expect(mockServices.http.post).toHaveBeenCalledTimes(1);
    expect(mockServices.http.post).toBeCalledWith('/internal/rac/alerts/find', {
      body: '{"consumers":["bar"],"rule_type_ids":["foo"]}',
    });
  });
});
