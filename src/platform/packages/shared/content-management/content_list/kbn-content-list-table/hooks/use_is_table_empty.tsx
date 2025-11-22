/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  useContentListConfig,
  useContentListItems,
  useContentListSearch,
  useContentListFilters,
  type ContentListItem,
} from '@kbn/content-list-provider';
import { NoItemsEmptyState, NoResultsEmptyState, ErrorEmptyState } from '../empty_state';

/**
 * Checks if a filter value is considered "active" (non-empty/non-null).
 * Handles various value types including arrays, Sets, Maps, Dates, and primitives.
 * For objects, recursively checks if any nested value is active.
 *
 * @param value - The filter value to check.
 * @returns `true` if the value represents an active filter.
 */
const hasFilterValue = (value: unknown): boolean => {
  if (value == null) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value instanceof Set || value instanceof Map) {
    return value.size > 0;
  }

  if (value instanceof Date) {
    return true;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'number') {
    return !Number.isNaN(value);
  }

  if (typeof value === 'object') {
    // Recursively check if any nested value is active.
    // This handles cases like `{ include: [], exclude: [] }` where the object
    // has keys but no actual active filter values.
    return Object.values(value as Record<string, unknown>).some(hasFilterValue);
  }

  return true;
};

/**
 * Checks if any filter in the filters object has an active value.
 *
 * @param filters - Record of filter keys to values.
 * @returns `true` if any filter has an active (non-empty) value.
 */
const hasActiveFilterValues = (filters: Record<string, unknown>): boolean => {
  return Object.values(filters ?? {}).some(hasFilterValue);
};

/**
 * Options for the {@link useIsTableEmpty} hook.
 */
export interface UseIsTableEmptyOptions {
  /**
   * Optional filtered items to use instead of provider items.
   * When provided, empty state detection uses these items.
   */
  filteredItems?: ContentListItem[];
}

/**
 * Hook to determine if the table should show empty state and which component to render.
 *
 * Automatically selects the appropriate empty state variant:
 * - {@link ErrorEmptyState} - When an error occurred loading items.
 * - {@link NoResultsEmptyState} - When search/filters return no results.
 * - {@link NoItemsEmptyState} - When the collection is empty (first-time use).
 *
 * @param options - Optional configuration including filtered items.
 * @returns Tuple of `[isTableEmpty, emptyStateComponent]`.
 */
export const useIsTableEmpty = (
  options?: UseIsTableEmptyOptions
): [boolean, React.ReactElement | null] => {
  const { entityName, entityNamePlural, globalActions } = useContentListConfig();
  const { items: providerItems, isLoading, error, refetch } = useContentListItems();
  const { queryText, clearSearch } = useContentListSearch();
  const { filters, clearFilters } = useContentListFilters();
  const hasSearch = queryText.trim().length > 0;
  const hasActiveFilters = useMemo(() => hasActiveFilterValues(filters), [filters]);

  // Use filtered items if provided, otherwise fall back to provider items.
  const items = options?.filteredItems ?? providerItems;
  const hasLocalFilter = options?.filteredItems !== undefined;

  // Determine if table is empty. The logic prevents flash during search/filter changes:
  // - If search/filters are active and no items, show empty state immediately (even while loading).
  // - Only wait for loading to complete when there's no search/filter (initial page load).
  const hasUserFiltering = hasSearch || hasActiveFilters || hasLocalFilter;
  const isTableEmpty = items.length === 0 && (hasUserFiltering || !isLoading);

  const emptyStateComponent = useMemo(() => {
    if (!isTableEmpty) {
      return null;
    }

    // 1. Error state takes precedence.
    if (error) {
      return (
        <ErrorEmptyState
          entityName={entityName}
          entityNamePlural={entityNamePlural}
          onRetry={refetch}
          error={error}
          data-test-subj="content-list-empty-state-error"
        />
      );
    }

    // 2. No results state (has active search/filters or local filter applied).
    if (hasSearch || hasActiveFilters || hasLocalFilter) {
      return (
        <NoResultsEmptyState
          entityName={entityName}
          entityNamePlural={entityNamePlural}
          hasActiveFilters={hasActiveFilters}
          hasSearch={hasSearch || hasLocalFilter}
          onClearFilters={hasActiveFilters ? clearFilters : undefined}
          onClearSearch={hasSearch ? clearSearch : undefined}
          data-test-subj="content-list-empty-state-no-results"
        />
      );
    }

    // 3. No items state (empty collection).
    return (
      <NoItemsEmptyState
        entityName={entityName}
        entityNamePlural={entityNamePlural}
        onCreate={globalActions?.onCreate}
        data-test-subj="content-list-empty-state-no-items"
      />
    );
  }, [
    isTableEmpty,
    error,
    hasSearch,
    hasActiveFilters,
    hasLocalFilter,
    entityName,
    entityNamePlural,
    globalActions?.onCreate,
    clearFilters,
    clearSearch,
    refetch,
  ]);

  return [isTableEmpty, emptyStateComponent];
};
