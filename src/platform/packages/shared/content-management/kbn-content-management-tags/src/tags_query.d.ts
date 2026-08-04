import type { Query } from '@elastic/eui';
import type { Tag } from './types';
/**
 * Parameters for the {@link useTags} hook.
 *
 * @typeParam T - The item type, must have an `id` property and optional `tags` array of tag IDs.
 */
export interface UseTagsParams<T extends {
    id: string;
    tags?: string[];
}> {
    /** The current EUI Query object representing the active search/filter state. */
    query: Query;
    /**
     * Callback to update the query when tag filters change.
     * @param query - The updated EUI Query object.
     */
    updateQuery: (query: Query) => void;
    /** The list of items to build the tag-to-item mapping from. */
    items: T[];
}
/**
 * Return value from the {@link useTags} hook.
 */
export interface UseTagsReturn {
    /**
     * Toggles a tag in/out of the include filter. If the tag is in the exclude filter, it is removed first.
     * @param tag - The tag to toggle.
     */
    toggleIncludeTagFilter: (tag: Tag) => void;
    /**
     * Toggles a tag in/out of the exclude filter. If the tag is in the include filter, it is removed first.
     * @param tag - The tag to toggle.
     */
    toggleExcludeTagFilter: (tag: Tag) => void;
    /** Removes all tag filter clauses from the query. */
    clearTagSelection: () => void;
    /** A mapping of tag IDs to arrays of item IDs that have that tag. */
    tagsToTableItemMap: {
        [tagId: string]: string[];
    };
}
/**
 * React hook for managing tag-based filtering in EUI Query search interfaces.
 *
 * Provides utilities to toggle tags between include/exclude filter states and
 * maintains a reverse mapping of tags to items for efficient lookups.
 *
 * The hook manipulates the `tag` field in EUI Query syntax:
 * - Include filter: `tag:tagName` (must match)
 * - Exclude filter: `-tag:tagName` (must not match)
 *
 * @typeParam T - The item type with required `id` and optional `tags` properties.
 *
 * @returns An object containing filter toggle functions and a tag-to-item mapping.
 *
 * @example
 * ```tsx
 * const { toggleIncludeTagFilter, toggleExcludeTagFilter, clearTagSelection, tagsToTableItemMap } =
 *   useTags({ query, updateQuery: setQuery, items: dashboards });
 *
 * // Add tag to include filter (or remove if already included)
 * toggleIncludeTagFilter(productionTag);
 *
 * // Add tag to exclude filter (or remove if already excluded)
 * toggleExcludeTagFilter(deprecatedTag);
 *
 * // Clear all tag filters
 * clearTagSelection();
 * ```
 */
export declare const useTags: <T extends {
    id: string;
    tags?: string[];
}>(params: UseTagsParams<T>) => UseTagsReturn;
