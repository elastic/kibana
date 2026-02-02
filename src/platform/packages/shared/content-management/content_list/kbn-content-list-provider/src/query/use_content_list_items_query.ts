/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';
import type { Dispatch } from 'react';
import { useQuery } from '@kbn/react-query';
import type { ContentListItem } from '../item';
import type { ContentListState, ContentListAction } from '../state/types';
import { CONTENT_LIST_ACTIONS } from '../state/types';
import { useContentListConfig } from '../context';
import { defaultTransform } from '../datasource';
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
 * - Transforms raw items to `ContentListItem` format.
 * - Dispatches state updates for items, loading, and error states.
 *
 * @param state - Current content list state.
 * @param dispatch - State dispatch function.
 * @returns Object with `refetch` function for manual data refresh.
 */
export const useContentListItemsQuery = (
  state: ContentListState,
  dispatch: Dispatch<ContentListAction>
) => {
  const { dataSource, queryKeyScope } = useContentListConfig();

  // Build query parameters from state.
  const queryParams = useMemo(
    () => ({
      searchQuery: state.filters.search ?? '',
      filters: state.filters,
      sort: state.sort,
      page: DEFAULT_PAGE,
    }),
    [state.filters, state.sort]
  );

  // Get transform function (default if not provided).
  const transform = dataSource.transform ?? defaultTransform;

  // React Query for data fetching.
  const query = useQuery({
    queryKey: contentListKeys.items(queryKeyScope, queryParams),
    queryFn: async ({ signal }) => {
      const result = await dataSource.findItems({ ...queryParams, signal });

      // Transform items to ContentListItem format.
      const transformedItems: ContentListItem[] = result.items.map(transform);

      // Invoke success callback if provided.
      if (dataSource.onFetchSuccess) {
        try {
          dataSource.onFetchSuccess(result);
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('[ContentListProvider] onFetchSuccess callback error:', error);
          }
        }
      }

      return {
        items: transformedItems,
        total: result.total,
      };
    },
  });

  // Sync query state to reducer state.
  useEffect(() => {
    if (query.isLoading || query.isFetching) {
      dispatch({ type: CONTENT_LIST_ACTIONS.SET_LOADING, payload: true });
    }
  }, [query.isLoading, query.isFetching, dispatch]);

  useEffect(() => {
    if (!query.isLoading && !query.isFetching) {
      dispatch({ type: CONTENT_LIST_ACTIONS.SET_LOADING, payload: false });
    }
  }, [query.isLoading, query.isFetching, dispatch]);

  useEffect(() => {
    if (query.data) {
      dispatch({
        type: CONTENT_LIST_ACTIONS.SET_ITEMS,
        payload: { items: query.data.items, totalItems: query.data.total },
      });
    }
  }, [query.data, dispatch]);

  useEffect(() => {
    if (query.error) {
      dispatch({
        type: CONTENT_LIST_ACTIONS.SET_ERROR,
        payload: query.error instanceof Error ? query.error : new Error(String(query.error)),
      });
    }
  }, [query.error, dispatch]);

  return {
    refetch: query.refetch,
  };
};
