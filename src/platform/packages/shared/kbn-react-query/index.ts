/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @kbn/eslint/module_migration */
import type { QueryClientConfig } from '@tanstack/react-query';
// eslint-disable-next-line import/no-extraneous-dependencies
import { QueryClient as TanstackQueryClient } from '@tanstack/query-core';

class QueryClient extends TanstackQueryClient {
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

export {
  TanstackQueryClient,
  QueryClient, // export the extended class, with the `networkMode: 'always'` behavior
};

// Re-export defined types
export type {
  CancelOptions,
  ContextOptions,
  DefaultedInfiniteQueryObserverOptions,
  DefaultedQueryObserverOptions,
  DefaultOptions,
  DefinedQueryObserverResult,
  DefinedUseBaseQueryResult,
  DefinedUseQueryResult,
  DehydratedState,
  DehydrateOptions,
  FetchInfiniteQueryOptions,
  FetchNextPageOptions,
  FetchPreviousPageOptions,
  FetchQueryOptions,
  FetchStatus,
  GetNextPageParamFunction,
  GetPreviousPageParamFunction,
  HydrateOptions,
  HydrateProps,
  InfiniteData,
  InfiniteQueryObserverBaseResult,
  InfiniteQueryObserverLoadingErrorResult,
  InfiniteQueryObserverLoadingResult,
  InfiniteQueryObserverOptions,
  InfiniteQueryObserverRefetchErrorResult,
  InfiniteQueryObserverResult,
  InfiniteQueryObserverSuccessResult,
  InitialDataFunction,
  InvalidateOptions,
  InvalidateQueryFilters,
  Logger,
  MutateFunction,
  MutateOptions,
  Mutation, // class, but exported as type-only
  MutationFilters,
  MutationFunction,
  MutationKey,
  MutationMeta,
  MutationObserverBaseResult,
  MutationObserverErrorResult,
  MutationObserverIdleResult,
  MutationObserverLoadingResult,
  MutationObserverOptions,
  MutationObserverResult,
  MutationObserverSuccessResult,
  MutationOptions,
  MutationStatus,
  NetworkMode,
  NotifyEvent,
  NotifyEventType,
  PlaceholderDataFunction,
  QueriesOptions,
  QueriesResults,
  Query, // class, but exported as type-only
  QueryClientConfig,
  QueryClientProviderProps,
  QueryErrorResetBoundaryProps,
  QueryFilters,
  QueryFunction,
  QueryFunctionContext,
  QueryKey,
  QueryKeyHashFunction,
  QueryMeta,
  QueryObserverBaseResult,
  QueryObserverLoadingErrorResult,
  QueryObserverLoadingResult,
  QueryObserverOptions,
  QueryObserverRefetchErrorResult,
  QueryObserverResult,
  QueryObserverSuccessResult,
  QueryOptions,
  QueryState,
  QueryStatus,
  RefetchOptions,
  RefetchPageFilters,
  RefetchQueryFilters,
  ResetOptions,
  ResetQueryFilters,
  ResultOptions,
  SetDataOptions,
  ShouldDehydrateMutationFunction,
  ShouldDehydrateQueryFunction,
  Updater,
  UseBaseMutationResult,
  UseBaseQueryOptions,
  UseBaseQueryResult,
  UseErrorBoundary,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  UseMutateAsyncFunction,
  UseMutateFunction,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
  WithRequired,
} from '@tanstack/react-query';

// Re-export consts, functions and classes
export {
  CancelledError,
  defaultContext,
  defaultShouldDehydrateMutation,
  defaultShouldDehydrateQuery,
  dehydrate,
  focusManager,
  hashQueryKey,
  hydrate,
  Hydrate,
  isCancelledError,
  isError,
  isServer,
  InfiniteQueryObserver,
  IsRestoringProvider,
  matchQuery,
  MutationCache,
  MutationObserver,
  notifyManager,
  onlineManager,
  parseFilterArgs,
  parseMutationArgs,
  parseMutationFilterArgs,
  parseQueryArgs,
  QueriesObserver,
  QueryCache,
  // QueryClient, // DO NOT EXPORT
  QueryClientProvider,
  QueryErrorResetBoundary,
  QueryObserver,
  replaceEqualDeep,
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
