/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const {
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
  QueryClient: OfficialQueryClient, // DO NOT EXPORT
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
} = require('@tanstack/official-react-query');

class QueryClient extends OfficialQueryClient {
  constructor(config) {
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
module.exports = {
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
  QueryClient,
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
};
