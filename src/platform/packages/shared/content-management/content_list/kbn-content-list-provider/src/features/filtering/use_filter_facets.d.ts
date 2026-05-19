import { type UseQueryResult } from '@kbn/react-query';
import { type FilterFacet } from '../types';
/**
 * React Query hook that calls a filter feature's `getFacets` callback.
 *
 * Returns display-ready {@link FilterFacet} arrays for filter popovers.
 * The `T` parameter carries through to the facet `data` field so renderers
 * receive typed payloads without casting.
 *
 * Disabled when the feature is `true` (no config) or `false` — only fires
 * when a {@link FilterFacetConfig} with `getFacets` is provided.
 *
 * Call with `enabled: isPopoverOpen` so it fires lazily on popover open.
 *
 * @param filterId - The filter dimension key (e.g. `'createdBy'`, `'tag'`).
 * @param opts - Options including `enabled` to control when the query fires.
 */
export declare const useFilterFacets: <T = unknown>(filterId: string, opts?: {
    enabled?: boolean;
}) => UseQueryResult<FilterFacet<T>[]>;
