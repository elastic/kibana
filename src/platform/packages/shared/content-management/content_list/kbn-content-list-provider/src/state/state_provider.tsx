/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useCallback, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { useMemo, useReducer } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { useTagServices } from '@kbn/content-management-tags';
import { useFavorites } from '@kbn/content-management-favorites-public';
import type { ContentListState, ContentListStateContextValue } from './types';
import { DEFAULT_FILTERS } from './types';
import { useContentListConfig } from '../context';
import { reducer } from './state_reducer';
import { useContentListItemsQuery } from '../query';
import { useIdentityResolver, useUserEnrichment } from '../features/search';

/**
 * Props for `ContentListStateProvider`.
 */
export interface ContentListStateProviderProps {
  /** Child components that will have access to the state context. */
  children: ReactNode;
}

/**
 * Context for the content list runtime state.
 * Use `useContentListState` to access this context.
 */
export const ContentListStateContext = createContext<ContentListStateContextValue | null>(null);

// TODO: clintandrewhall - this needs to come from Kibana UI Settings.
const DEFAULT_PAGE_SIZE = 20;

/**
 * Internal provider component that manages the runtime state of the content list.
 *
 * This provider:
 * - Initializes state from the configuration context.
 * - Uses React Query for data fetching with caching and deduplication.
 * - Provides dispatch function for state updates.
 *
 * This is automatically included when using `ContentListProvider` and
 * should not be used directly.
 *
 * @internal
 */
export const ContentListStateProvider = ({ children }: ContentListStateProviderProps) => {
  const { features, isReadOnly, dataSource, entityName, queryKeyScope, supports } =
    useContentListConfig();
  const { pagination, sorting, search, filtering } = features;

  // Fetch favorites data from React Query.
  // Used for: 1) showing star icon on items, 2) reactive starred filtering.
  // When favorites change, the useMemo below automatically re-filters the list.
  const { data: favoritesData } = useFavorites({ enabled: supports.starred });

  // Initial state with sensible defaults.
  const initialState: ContentListState = useMemo(() => {
    // Determine initial page size from pagination config (default: 20).
    // TODO: clintandrewhall - this needs to come from Kibana UI Settings.
    const size =
      typeof pagination === 'object' && pagination.initialPageSize
        ? pagination.initialPageSize
        : DEFAULT_PAGE_SIZE;

    // Determine initial sort from sorting config (default: title ascending).
    // Note: Items are transformed to `ContentListItem` format, so field is `'title'` not `'attributes.title'`.
    const sort =
      typeof sorting === 'object' && sorting.initialSort
        ? sorting.initialSort
        : { field: 'title', direction: 'asc' as const };

    // Determine initial query text from search config (default: empty).
    const initialQueryText =
      typeof search === 'object' && search.initialQuery ? search.initialQuery : '';

    return {
      items: [],
      totalItems: 0,
      isLoading: true, // Start as loading since query will fetch on mount.
      search: {
        queryText: initialQueryText, // Search query text (serializable).
      },
      filters: { ...DEFAULT_FILTERS },
      sort,
      page: {
        index: 0,
        size,
      },
      selectedItems: new Set(),
      isReadOnly: isReadOnly ?? false,
    };
  }, [pagination, sorting, search, isReadOnly]);

  const [localState, dispatch] = useReducer(reducer, initialState);

  // Extract debounce delay from datasource config, with fallback to search config.
  // Default is 0 (no debounce) - server packages should set a debounce value.
  const debounceMs =
    dataSource.debounceMs ??
    (typeof search === 'object' && typeof search.debounceMs === 'number' ? search.debounceMs : 0);

  // Get filtering config for query parsing.
  const filteringConfig = typeof filtering === 'object' ? filtering : undefined;

  // Track the debounced search query text.
  // This value is updated after the debounce delay to prevent excessive server requests.
  // For client-side processing, debounce is 0 so updates are immediate.
  const [debouncedQueryText, setDebouncedQueryText] = useState(initialState.search.queryText);

  // Track the time of the last query text change to detect typing vs clicking.
  // Rapid successive changes (within debounceMs) indicate typing → debounce.
  // Isolated changes (after a pause) indicate a filter click → apply immediately.
  const lastChangeTimeRef = useRef(Date.now());
  const isInitialMount = useRef(true);

  // Debounce all query text changes.
  // This ensures typing (whether free-text or filter syntax) is debounced.
  useDebounce(
    () => {
      if (debounceMs > 0 && localState.search.queryText !== debouncedQueryText) {
        setDebouncedQueryText(localState.search.queryText);
      }
    },
    debounceMs,
    [localState.search.queryText, debouncedQueryText, debounceMs]
  );

  // Handle immediate updates for:
  // 1. When debouncing is disabled (debounceMs === 0).
  // 2. When a change comes after a pause (likely a filter click, not typing).
  useEffect(() => {
    // Skip on initial mount to avoid double-firing with initial state.
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const queryTextChanged = localState.search.queryText !== debouncedQueryText;
    if (!queryTextChanged) {
      return;
    }

    const now = Date.now();
    const timeSinceLastChange = now - lastChangeTimeRef.current;
    lastChangeTimeRef.current = now;

    // Update immediately if:
    // 1. Debouncing is disabled (debounceMs: 0), OR
    // 2. Enough time has passed since the last change (likely a click, not typing).
    //    This handles filter button clicks that come after a period of no typing.
    if (debounceMs === 0 || timeSinceLastChange > debounceMs) {
      setDebouncedQueryText(localState.search.queryText);
    }
  }, [localState.search.queryText, debouncedQueryText, debounceMs]);

  // Get tag list for query parsing (handles tag name → ID conversion).
  // Uses optional hook since tags may not be enabled.
  const tagServices = useTagServices();
  const tagList = tagServices?.getTagList();

  // Create identity resolver for createdBy filter deduplication.
  const createdByResolver = useIdentityResolver();

  // Use React Query for data fetching.
  // Uses the debounced query text to prevent excessive requests while typing.
  const {
    data,
    isLoading: queryIsLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useContentListItemsQuery({
    dataSource,
    entityName,
    queryKeyScope,
    searchQueryText: debouncedQueryText,
    filters: localState.filters,
    sort: localState.sort,
    page: localState.page,
    tagList,
    filteringConfig,
  });

  // Handle user profile enrichment and identity resolution.
  // This fetches user profiles for client-side enrichment or extracts user info
  // from server-enriched items, and registers mappings for createdBy filter deduplication.
  useUserEnrichment({ data, identityResolver: createdByResolver });

  // Determine if starred filter is active (from filter state or query text).
  // Uses case-insensitive check for query text to handle variations like `is:Starred`.
  const isStarredFilterActive =
    localState.filters.starredOnly || debouncedQueryText.toLowerCase().includes('is:starred');

  // Apply starred filtering reactively using favoritesData from React Query.
  // This enables automatic updates when favorites change without manual refetch.
  // When starred filter is active, the adapter returns ALL items (unpaginated),
  // so we filter and paginate here.
  const { filteredItems, filteredTotal } = useMemo(() => {
    const items = data?.items ?? [];
    const total = data?.total ?? 0;

    // If starred filter is not active, use items as-is (already paginated by adapter).
    if (!isStarredFilterActive) {
      return { filteredItems: items, filteredTotal: total };
    }

    // If favorites data isn't available yet, show loading state (empty).
    if (!favoritesData?.favoriteIds) {
      return { filteredItems: [], filteredTotal: 0 };
    }

    // Filter by starred using reactive favoritesData.
    const favoriteIdSet = new Set(favoritesData.favoriteIds);
    const starredItems = items.filter((item) => favoriteIdSet.has(item.id));

    // Paginate the starred results.
    const { index: pageIndex, size: pageSize } = localState.page;
    const startIdx = pageIndex * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedItems = starredItems.slice(startIdx, endIdx);

    return { filteredItems: paginatedItems, filteredTotal: starredItems.length };
  }, [
    data?.items,
    data?.total,
    isStarredFilterActive,
    favoritesData?.favoriteIds,
    localState.page,
  ]);

  // Combine local state with query results.
  const state: ContentListState = useMemo(
    () => ({
      ...localState,
      // Data from query (with reactive starred filtering applied).
      items: filteredItems,
      totalItems: filteredTotal,
      // Loading state: true during initial load or when fetching.
      isLoading: queryIsLoading || isFetching,
      // Error from query.
      error: queryError instanceof Error ? queryError : undefined,
    }),
    [localState, filteredItems, filteredTotal, queryIsLoading, isFetching, queryError]
  );

  // Wrap refetch to match the expected signature.
  // Clears any internal caches (e.g., in client provider adapter) before refetching.
  const handleRefetch = useCallback(() => {
    dataSource.clearCache?.();
    refetch();
  }, [dataSource, refetch]);

  return (
    <ContentListStateContext.Provider
      value={{ state, dispatch, refetch: handleRefetch, createdByResolver }}
    >
      {children}
    </ContentListStateContext.Provider>
  );
};
