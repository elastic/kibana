/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { QueryClientProvider } from '@kbn/react-query';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { QueryClient } from '@kbn/react-query';
import { createResponseOpsQueryClient } from '../utils/create_response_ops_query_client_config';
import { ResponseOpsQueryClientContext } from '../contexts/response_ops_query_client_context';
import { useResponseOpsQueryClient } from '../hooks/use_response_ops_query_client';

export interface ResponseOpsQueryClientProviderProps extends PropsWithChildren {
  queryClient?: QueryClient;
  dependencies?: {
    notifications: NotificationsStart;
  };
}

/**
 * Provides a QueryClient configured for RO usages, including error handling that displays toasts for queries
 * that have a defined meta.getErrorToast option.
 * If nested within another ResponseOpsQueryClientProvider, it will reuse the existing QueryClient.
 */
export const ResponseOpsQueryClientProvider = memo(
  ({
    queryClient,
    dependencies: externalDependencies,
    children,
  }: ResponseOpsQueryClientProviderProps) => {
    const {
      services: { notifications },
    } = useKibana();
    const existingQueryClient = useResponseOpsQueryClient();

    const selectedQueryClient = useMemo(() => {
      if (queryClient) {
        return queryClient;
      }
      if (existingQueryClient) {
        return existingQueryClient;
      }
      return createResponseOpsQueryClient({
        dependencies:
          externalDependencies ??
          (notifications
            ? {
                notifications,
              }
            : undefined),
      });
    }, [queryClient, existingQueryClient, externalDependencies, notifications]);

    if (existingQueryClient) {
      return <>{children}</>;
    }

    return (
      <QueryClientProvider client={selectedQueryClient}>
        {/* In v5 queryContext was removed, so we also provide the client using a normal
            context to deduplicate nested provided clients */}
        <ResponseOpsQueryClientContext.Provider value={queryClient}>
          {children}
        </ResponseOpsQueryClientContext.Provider>
      </QueryClientProvider>
    );
  }
);
