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
import type { DataSourceConfig, FindItemsParams, ResolvedFilters } from '../datasource';
import type { ContentListItem, TransformFunction } from '../item';
import type { ActiveFilters, FilteringConfig } from '../features/filtering';
import { defaultTransform } from '../datasource';
import type { FindItemsResult } from '../datasource';
import { contentListKeys } from './keys';
import { parseQueryText, type TagItem } from './parsing';

export { contentListKeys } from './keys';

export interface UseContentListItemsQueryParams<T>
  extends Pick<FindItemsParams, 'filters' | 'sort' | 'page'> {
  /** Data source configuration with `findItems` function. */
  dataSource: DataSourceConfig<T>;
  /** Entity name for query key namespacing (e.g., "dashboard", "visualization"). */
  entityName?: string;
  /**
   * Unique scope identifier for React Query cache keys.
   * Use when multiple lists share the same `entityName` but have different data sources.
   */
  queryKeyScope?: string;
  /** Search query text (serializable string). */
  searchQueryText: string;
  /** Whether the query is enabled. */
  enabled?: boolean;
  /** Tag list for parsing tag filters from query text. */
  tagList?: TagItem[];
  /** Filtering configuration (used to determine custom filter fields to parse). */
  filteringConfig?: FilteringConfig;
}

export interface UseContentListItemsQueryResult {
  /** The fetched and transformed items. */
  items: ContentListItem[];
  /** Total number of items matching the query. */
  total: number;
  /** Maps raw filter inputs to their resolved canonical values. */
  resolvedFilters?: ResolvedFilters;
}

/**
 * Safely invokes the `onFetchSuccess` callback, catching and logging any errors.
 */
const invokeSuccessCallback = <T>(
  callback: ((result: FindItemsResult<T>) => void) | undefined,
  result: FindItemsResult<T>
): void => {
  if (!callback) {
    return;
  }
  try {
    callback(result);
  } catch (callbackError) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[ContentListProvider] onFetchSuccess callback threw an error:', callbackError);
    }
  }
};

/**
 * React Query hook for fetching content list items.
 *
 * This hook provides data fetching with React Query caching and deduplication.
 * The `findItems` function is responsible for handling filtering, sorting,
 * and pagination - either client-side or server-side.
 *
 * @template T The raw item type from datasource.
 */
export const useContentListItemsQuery = <T>({
  dataSource,
  entityName,
  queryKeyScope,
  searchQueryText,
  filters,
  sort,
  page,
  enabled = true,
  tagList,
  filteringConfig,
}: UseContentListItemsQueryParams<T>) => {
  // Cast is safe: when T doesn't extend UserContentCommonSchema, DataSourceConfig requires
  // transform (it's not optional), so this fallback is only reached when T is compatible.
  const transform: TransformFunction<T> =
    dataSource.transform ?? (defaultTransform as TransformFunction<T>);

  // Parse query text to extract all filters (tags, starred, users, custom) and clean search text.
  const parsedQuery = useMemo(
    () => parseQueryText(searchQueryText, { tagList, filteringConfig, logErrors: true }),
    [searchQueryText, tagList, filteringConfig]
  );

  const { tagIds, tagIdsToExclude, starredOnly, users, customFilters, cleanSearchQuery } =
    parsedQuery;

  // Merge parsed filters with explicit filters.
  const mergedFilters: Partial<ActiveFilters> = useMemo(() => {
    const hasTags =
      (tagIds && tagIds.length > 0) || (tagIdsToExclude && tagIdsToExclude.length > 0);

    const merged: Partial<ActiveFilters> = {
      ...filters,
      tags: hasTags
        ? {
            include: tagIds ?? [],
            exclude: tagIdsToExclude ?? [],
          }
        : filters.tags,
      users: users ?? filters.users,
      starredOnly: starredOnly ? true : filters.starredOnly,
    };

    // Merge custom filter values.
    Object.entries(customFilters).forEach(([key, value]) => {
      merged[key] = value;
    });

    return merged;
  }, [filters, tagIds, tagIdsToExclude, users, starredOnly, customFilters]);

  const queryParams: Omit<FindItemsParams, 'signal'> = {
    searchQuery: cleanSearchQuery ?? '',
    filters: mergedFilters,
    sort,
    page,
  };

  // Use dynamic query key based on all params for proper cache isolation.
  const queryKey = contentListKeys.items(entityName, queryKeyScope, queryParams);

  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }): Promise<UseContentListItemsQueryResult> => {
      const result = await dataSource.findItems({ ...queryParams, signal });

      const transformedItems = result.items.map(transform);
      invokeSuccessCallback(dataSource.onFetchSuccess, result);

      // Dev-mode warning if findItems returns more items than requested page size.
      if (process.env.NODE_ENV === 'development' && transformedItems.length > page.size) {
        // eslint-disable-next-line no-console
        console.warn(
          `[useContentListItemsQuery] findItems returned ${transformedItems.length} items, ` +
            `but page.size is ${page.size}. The findItems implementation should respect pagination.`
        );
      }

      return {
        items: transformedItems,
        total: result.total,
        resolvedFilters: result.resolvedFilters,
      };
    },
    enabled,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  return query;
};
