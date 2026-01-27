/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import type { PropsWithChildren } from 'react';
import { QueryClientProvider } from '@kbn/react-query';
import type { QueryClientConfig } from '@kbn/react-query';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import type { ResponseOpsQueryClientProviderProps } from '../providers/response_ops_query_client_provider';
import { testQueryClientConfig } from './test_query_client_config';
import { createResponseOpsQueryClient } from '../utils/create_response_ops_query_client_config';
import { ResponseOpsQueryClientContext } from '../contexts/response_ops_query_client_context';

const notifications = notificationServiceMock.createStartContract();

/**
 * Creates a real QueryClient and a Provider component for testing purposes (disabled retries, and caching).
 */
export const createTestResponseOpsQueryClient = (options?: {
  /**
   * Client configuration option overrides
   */
  config?: QueryClientConfig;
  /**
   * Dependencies used in the global query callbacks, automatically mocked if not provided.
   * You may want to provide custom mocked dependencies to perform assertions on them.
   */
  dependencies?: ResponseOpsQueryClientProviderProps['dependencies'];
}) => {
  const { config, dependencies } = options ?? {};
  const queryClient = createResponseOpsQueryClient({
    config: config ?? testQueryClientConfig,
    dependencies: dependencies ?? {
      notifications,
    },
  });
  return {
    queryClient,
    provider: memo(({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        <ResponseOpsQueryClientContext.Provider value={queryClient}>
          {children}
        </ResponseOpsQueryClientContext.Provider>
      </QueryClientProvider>
    )),
  };
};
