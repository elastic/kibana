import type { UseContentListFiltersReturn } from './types';
/**
 * Hook to read the current filter state and clear all filters.
 *
 * Derives `ActiveFilters` from `queryText` via `useActiveFilters`.
 *
 * `clearFilters` strips structured filter/flag clauses from `queryText`
 * while preserving free-text search. For example, clearing
 * `"tag:production is:starred my search"` yields `"my search"`.
 *
 * @returns A {@link UseContentListFiltersReturn} object.
 */
export declare const useContentListFilters: () => UseContentListFiltersReturn;
