/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@kbn/react-query';
import type { ContentListClientState, ContentListQueryData } from '../state/types';
import { useContentListConfig } from '../context';
import { useUserProfileStoreContext } from '../services';
import { useQueryModel, toFindItemsFilters } from '../query_model';
import { contentListKeys } from './keys';
import { useResolveQueryDisplayValues } from './use_resolve_query_display_values';

const DEFAULT_PAGE = { index: 0, size: 20 };

const USER_UID_FIELDS = ['createdBy'] as const;

/**
 * React Query hook for fetching content list items.
 *
 * Derives {@link ActiveFilters} from `queryText` via {@link useQueryModel}.
 *
 * When the data source provides an `invalidate` callback, the returned
 * `refetch` function calls it before re-executing the query so that any
 * internal cache (e.g. in a client-side strategy) is cleared first.
 */
export const useContentListItemsQuery = (
  clientState: ContentListClientState
): ContentListQueryData & { refetch: () => Promise<void> } => {
  const { dataSource, queryKeyScope, supports } = useContentListConfig();
  const userProfileStore = useUserProfileStoreContext();

  const model = useQueryModel(clientState.queryText);
  const activeFilters = useMemo(() => toFindItemsFilters(model), [model]);

  const queryParams = useMemo(
    () => ({
      searchQuery: activeFilters.search ?? '',
      filters: activeFilters,
      sort: supports.sorting ? clientState.sort : undefined,
      page: supports.pagination ? clientState.page : DEFAULT_PAGE,
    }),
    [activeFilters, clientState.sort, clientState.page, supports.sorting, supports.pagination]
  );

  const query = useQuery({
    queryKey: contentListKeys.items(queryKeyScope, queryParams),
    keepPreviousData: true,
    queryFn: async ({ signal }) => {
      const result = await dataSource.findItems({ ...queryParams, signal });

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

  // Seed user profile cache with UIDs from fetched items.
  const items = query.data?.items;
  const prevDataUpdatedAtRef = useRef(query.dataUpdatedAt);
  useEffect(() => {
    if (!userProfileStore || !items || prevDataUpdatedAtRef.current === query.dataUpdatedAt) {
      return;
    }
    prevDataUpdatedAtRef.current = query.dataUpdatedAt;

    const uids = new Set<string>();
    for (const item of items) {
      for (const field of USER_UID_FIELDS) {
        const uid = item[field];
        if (typeof uid === 'string') {
          uids.add(uid);
        }
      }
    }
    if (uids.size > 0) {
      userProfileStore.ensureLoaded(Array.from(uids));
    }
  }, [items, query.dataUpdatedAt, userProfileStore]);

  useResolveQueryDisplayValues(clientState.queryText);

  // Clear any data-source-level cache before re-executing the query.
  const refetch = useCallback(async () => {
    dataSource.onInvalidate?.();
    await query.refetch();
  }, [dataSource, query]);

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
    refetch,
  };
};
