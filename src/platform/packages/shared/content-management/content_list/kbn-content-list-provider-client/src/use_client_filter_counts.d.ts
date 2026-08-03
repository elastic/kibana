/**
 * Returns a map of option value → item count for the given filter, computed
 * client-side from the current items snapshot with all other active filters
 * applied (faceted counts). Returns an empty map when the filter id is not
 * registered or no items are loaded.
 *
 * Must be called inside a {@link ContentListClientProvider} tree.
 */
export declare const useClientFilterCounts: (filterId: string) => ReadonlyMap<string, number>;
