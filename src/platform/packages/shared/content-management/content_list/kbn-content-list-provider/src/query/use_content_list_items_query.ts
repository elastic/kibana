/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { ContentListClientState, ContentListQueryData } from '../state/types';
import { useContentListConfig } from '../context';
import { contentListKeys } from './keys';

/**
 * Default page configuration.
 */
const DEFAULT_PAGE = { index: 0, size: 20 };

/**
 * React Query hook for fetching content list items.
 *
 * This hook:
 * - Fetches items using the configured `findItems` function.
 * - Returns query data directly (items, loading, error) without dispatching.
 *
 * Note: Items are expected to already be in `ContentListItem` format.
 * Transformation should happen in the `findItems` implementation.
 *
 * @param clientState - Client-controlled state (filters, sort).
 * @returns Query data and refetch function.
 */
export const useContentListItemsQuery = (
  clientState: ContentListClientState
): ContentListQueryData & { refetch: () => void } => {
  const { dataSource, queryKeyScope, supports } = useContentListConfig();

  // Build query parameters from client state.
  // Only include sort if sorting is supported; otherwise, let the data source use its natural order.
  // Only include page if pagination is supported; otherwise, use a sensible default.
  const queryParams = useMemo(
    () => ({
      searchQuery: clientState.filters.search ?? '',
      filters: clientState.filters,
      sort: supports.sorting ? clientState.sort : undefined,
      page: supports.pagination ? clientState.page : DEFAULT_PAGE,
    }),
    [clientState.filters, clientState.sort, clientState.page, supports.sorting, supports.pagination]
  );

  // React Query for data fetching.
  // `keepPreviousData` retains the previous results while a new query loads,
  // preventing the table from flashing empty when page, filters, or search text change.
  const query = useQuery({
    queryKey: contentListKeys.items(queryKeyScope, queryParams),
    keepPreviousData: true,
    queryFn: async ({ signal }) => {
      const result = await dataSource.findItems({ ...queryParams, signal });

      // Invoke success callback if provided.
      // Note: Errors from `onFetchSuccess` are caught and logged to prevent them from
      // breaking the query. In production, errors are logged but not surfaced to the UI.
      // If you need to handle callback failures, consider adding error handling within
      // your `onFetchSuccess` implementation.
      if (dataSource.onFetchSuccess) {
        try {
          dataSource.onFetchSuccess(result);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('[ContentListProvider] onFetchSuccess callback error:', error);
        }
      }

      return result;
    },
  });

  // Derive error (normalize to Error type).
  const error = useMemo(() => {
    if (!query.error) {
      return undefined;
    }
    return query.error instanceof Error ? query.error : new Error(String(query.error));
  }, [query.error]);

  return {
    items: query.data?.items ?? [],
    totalItems: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error,
    refetch: query.refetch,
  };
};
