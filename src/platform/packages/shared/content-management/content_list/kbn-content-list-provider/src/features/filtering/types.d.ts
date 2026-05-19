import type { ActiveFilters } from '../../datasource';
/**
 * Return type for the {@link useContentListFilters} hook.
 */
export interface UseContentListFiltersReturn {
    /** Currently active filters (derived from query text and state). */
    filters: ActiveFilters;
    /** Clear all filter and flag clauses from `queryText`, preserving free-text search. */
    clearFilters: () => void;
}
