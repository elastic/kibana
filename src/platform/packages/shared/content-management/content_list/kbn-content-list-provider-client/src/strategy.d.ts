import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { ActiveFilters, FindItemsFn } from '@kbn/content-list-provider';
import { MANAGED_USER_FILTER, NO_CREATOR_USER_FILTER, getCreatorKey } from '@kbn/content-list-provider';
import type { TableListViewFindItemsFn } from './types';
import type { ContentListFilterMap } from './filters';
import type { ContentListSortFieldMap } from './sorting';
export { MANAGED_USER_FILTER, NO_CREATOR_USER_FILTER, getCreatorKey };
/**
 * Enriches raw items with external data (e.g. `starred` status).
 *
 * Called at cache-fill time and on {@link ClientStrategy.onRefresh}.
 * The returned array must have the same length and order as the input.
 */
export type ItemDecorator = (items: UserContentCommonSchema[]) => Promise<UserContentCommonSchema[]>;
/** Callback passed to {@link ClientStrategy.subscribe}; called whenever the items snapshot changes. */
export type ItemsSnapshotListener = () => void;
type DynamicConfig<T> = T | (() => T);
/**
 * Return type from {@link createClientStrategy}.
 */
export interface ClientStrategy {
    /**
     * Fetches items and applies client-side filtering, sorting, and pagination.
     *
     * Internally caches the server response keyed by `searchQuery`. Calls to
     * `findItems` with the same `searchQuery` reuse the cache and only
     * recompute the client-side transforms. A new `searchQuery` triggers a
     * fresh server fetch.
     *
     * The core provider calls {@link ClientStrategy.onInvalidate} before
     * refetching after mutations so the next call always hits the server.
     */
    findItems: FindItemsFn;
    /**
     * Called by the core provider before an explicit refetch (e.g. after a
     * mutation) to clear the internal item cache. The next `findItems` call
     * will fetch from the server regardless of `searchQuery`.
     */
    onInvalidate: () => void;
    /**
     * Re-runs the `decorate` callback on existing raw items without a
     * server round-trip. Call after external data mutations (e.g. star/unstar)
     * so the cached decorated items are refreshed.
     */
    onRefresh: () => Promise<void>;
    /** Returns the full (unfiltered, decorated) item set from the most recent fetch. */
    getItems: () => UserContentCommonSchema[];
    /** Subscribe to full item snapshot changes. */
    subscribe: (listener: ItemsSnapshotListener) => () => void;
}
/**
 * Apply client-side filters to the item set.
 *
 * - Field filters use registered dimensions.
 * - Boolean flag filters (e.g. `starred`) are detected generically via
 *   {@link getIncludeExcludeFlag} and matched against `item[key]`.
 *
 * Exported so that {@link ContentListClientProvider} facet implementations can
 * apply the same filtering to compute faceted counts.
 */
export declare const filterItems: (items: UserContentCommonSchema[], filters: ActiveFilters, customFilters?: ContentListFilterMap) => UserContentCommonSchema[];
/**
 * Creates a client strategy that wraps a `TableListView`-style `findItems` function.
 *
 * The strategy caches the server response keyed by `searchQuery`. When filters,
 * sort, or page change without a new search query, the cached items are reused
 * and only the client-side transforms are reapplied — no server fetch occurs.
 *
 * The core provider calls {@link ClientStrategy.onInvalidate} before any
 * explicit refetch (e.g. after a delete) to force the next `findItems` call
 * to hit the server.
 *
 * @param tableListViewFindItems - The consumer's existing `findItems` function.
 * @param decorate - Optional callback that enriches raw items with external data.
 * @param listingLimit - Maximum number of items to fetch from the server per request.
 * @returns A {@link ClientStrategy} with `findItems`, `onInvalidate`, `onRefresh`, and `getItems`.
 */
export declare const createClientStrategy: (tableListViewFindItems: TableListViewFindItemsFn, decorate?: ItemDecorator, listingLimit?: number, customFilters?: DynamicConfig<ContentListFilterMap>, customSorts?: DynamicConfig<ContentListSortFieldMap>) => ClientStrategy;
