/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DefaultOptions,
  QueryClientConfig,
  QueryClientProviderProps,
  QueryErrorResetBoundaryProps,
  QueryFilters,
} from '@tanstack/react-query';
import {
  QueryClient as OriginalQueryClient,
  QueryClientProvider,
  QueryErrorResetBoundary,
  useHydrate,
  useInfiniteQuery,
  useIsFetching,
  useIsMutating,
  useIsRestoring,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  useQueryErrorResetBoundary,
} from '@tanstack/react-query';

class QueryClient extends OriginalQueryClient {
  constructor(config: QueryClientConfig = {}) {
    super({
      ...config,
      defaultOptions: {
        ...config.defaultOptions,
        queries: {
          networkMode: 'always',
          ...config.defaultOptions?.queries,
        },
        mutations: {
          networkMode: 'always',
          ...config.defaultOptions?.mutations,
        },
      },
    });
  }
}

export type {
  DefaultOptions,
  QueryClientConfig,
  QueryClientProviderProps,
  QueryErrorResetBoundaryProps,
  QueryFilters,
};

export {
  QueryClient, // export the extended class, with the `networkMode: 'always'` behavior
  QueryClientProvider,
  QueryErrorResetBoundary,
  useHydrate,
  useInfiniteQuery,
  useIsFetching,
  useIsMutating,
  useIsRestoring,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  useQueryErrorResetBoundary,
};
