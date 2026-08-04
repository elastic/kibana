/**
 * Minimal entry shape needed to compute recency. Compatible with
 * `RecentlyAccessedHistoryItem` from `@kbn/recently-accessed`.
 */
export interface RecentlyAccessedEntry {
    id: string;
}
/**
 * Minimal source contract — anything that can return a most-recent-first
 * list of `{ id }` entries. Compatible with `RecentlyAccessed` from
 * `@kbn/recently-accessed` (consumers typically pass that directly).
 */
export interface RecentlyAccessedHistorySource<Entry extends RecentlyAccessedEntry = RecentlyAccessedEntry> {
    /** Returns the current most-recent-first list of entries. */
    get(): Entry[];
}
