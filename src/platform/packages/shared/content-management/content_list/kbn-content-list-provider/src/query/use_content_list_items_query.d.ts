import type { ContentListClientState, ContentListQueryData } from '../state/types';
/**
 * React Query hook for fetching content list items.
 *
 * Derives {@link ActiveFilters} from `queryText` via {@link useQueryModel}.
 *
 * When the data source provides an `invalidate` callback, the returned
 * `refetch` function calls it before re-executing the query so that any
 * internal cache (e.g. in a client-side strategy) is cleared first.
 */
export declare const useContentListItemsQuery: (clientState: ContentListClientState) => ContentListQueryData & {
    refetch: () => Promise<void>;
    requery: () => Promise<void>;
};
