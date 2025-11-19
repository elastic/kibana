/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserProfile } from '@kbn/core-user-profile-common';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { FindItemsFn, FindItemsParams, FindItemsResult } from '@kbn/content-list-provider';

/**
 * Reference type matching `SavedObjectsFindOptionsReference` from Kibana core.
 */
export interface SavedObjectReference {
  type: string;
  id: string;
  name?: string;
}

/**
 * The existing `TableListView` `findItems` signature that consumers already have.
 *
 * This matches the signature expected by `TableListViewTableProps.findItems`:
 * ```typescript
 * findItems(
 *   searchQuery: string,
 *   refs?: {
 *     references?: SavedObjectsFindOptionsReference[];
 *     referencesToExclude?: SavedObjectsFindOptionsReference[];
 *   }
 * ): Promise<{ total: number; hits: T[] }>;
 * ```
 */
export type TableListViewFindItemsFn<T> = (
  searchQuery: string,
  refs?: {
    references?: SavedObjectReference[];
    referencesToExclude?: SavedObjectReference[];
  }
) => Promise<{ total: number; hits: T[] }>;

/**
 * Function to bulk fetch user profiles by UIDs.
 * Used to resolve usernames/emails to UIDs for filtering.
 */
export type BulkGetUserProfilesFn = (uids: string[]) => Promise<UserProfile[]>;

/**
 * Function to get the list of favorite item IDs.
 * Used to filter items when `starredOnly` is true.
 */
export type GetFavoriteIdsFn = () => Promise<string[]>;

/**
 * Options for creating a find items adapter.
 * @template T The item type returned by the consumer's `findItems` function.
 */
export interface CreateFindItemsAdapterOptions<T> {
  /**
   * The consumer's existing `findItems` function (same signature as `TableListView`).
   * Pass your existing implementation directly - no changes needed.
   */
  findItems: TableListViewFindItemsFn<T>;

  /**
   * Optional function to fetch user profiles.
   * When provided, enables resolution of usernames/emails to UIDs for filtering.
   * Without this, user filter values are compared directly against `item.createdBy`.
   */
  bulkGetUserProfiles?: BulkGetUserProfilesFn;
}

/**
 * Result of creating a find items adapter.
 * @template T The item type.
 */
export interface CreateFindItemsAdapterResult<T> {
  /** The adapted find items function compatible with `ContentListProvider`. */
  findItems: FindItemsFn<T>;
  /**
   * Clears the adapter's internal cache.
   * Called before refetch to ensure fresh data is fetched from the server.
   */
  clearCache: () => void;
}

/**
 * Sorts items by a specified field.
 * @template T The item type.
 */
const sortItems = <T extends UserContentCommonSchema>(
  items: T[],
  field: string,
  direction: 'asc' | 'desc',
  getFieldValue: (item: T, field: string) => string | number | null
): T[] => {
  return [...items].sort((a, b) => {
    const aValue = getFieldValue(a, field);
    const bValue = getFieldValue(b, field);

    if (aValue === null && bValue === null) {
      return 0;
    }
    if (aValue === null) {
      return direction === 'asc' ? 1 : -1;
    }
    if (bValue === null) {
      return direction === 'asc' ? -1 : 1;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return direction === 'asc' ? comparison : -comparison;
    }

    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

/**
 * Gets the value of a field from a `UserContentCommonSchema` item for sorting.
 * Handles the nested `attributes` structure and custom attributes.
 * Returns `null` for missing values so the sorting logic can push them to the end.
 */
const getUserContentFieldValue = <T extends UserContentCommonSchema>(
  item: T,
  field: string
): string | number | null => {
  // Handle known top-level fields.
  // Return null for missing values so they sort to the end.
  if (field === 'title') {
    return item.attributes?.title ?? '';
  }
  if (field === 'description') {
    return item.attributes?.description ?? null;
  }
  if (field === 'updatedAt') {
    return item.updatedAt ?? null;
  }
  if (field === 'createdAt') {
    return item.createdAt ?? null;
  }

  // Check top-level item fields first (id, type, etc.).
  const topLevelValue = (item as unknown as Record<string, unknown>)[field];
  if (topLevelValue !== undefined) {
    return topLevelValue as string | number | null;
  }

  // Check custom attributes (status, priority, etc.).
  const attributeValue = (item.attributes as Record<string, unknown>)?.[field];
  return (attributeValue as string | number | null) ?? null;
};

/**
 * Generates a cache key for the fetch operation.
 * Only includes parameters that should trigger a new server request.
 * Sort and page are excluded since they're handled client-side.
 */
const generateFetchKey = (
  searchQuery: string,
  tagIds: string[] | undefined,
  tagIdsToExclude: string[] | undefined
): string => {
  return JSON.stringify({
    searchQuery,
    tagIds: tagIds?.sort() ?? [],
    tagIdsToExclude: tagIdsToExclude?.sort() ?? [],
  });
};

/**
 * Builds a reverse lookup map from user profiles.
 * Maps username and email to UID for resolving filter values.
 */
const buildUserLookupMap = (profiles: UserProfile[]): Map<string, string> => {
  const lookupMap = new Map<string, string>();
  for (const profile of profiles) {
    const { uid, user } = profile;
    // Map username to UID.
    if (user.username) {
      lookupMap.set(user.username.toLowerCase(), uid);
    }
    // Map email to UID (if available).
    if (user.email) {
      lookupMap.set(user.email.toLowerCase(), uid);
    }
    // Also map UID to itself for direct UID lookups.
    lookupMap.set(uid, uid);
  }
  return lookupMap;
};

/**
 * Sentinel value representing items with no creator.
 * Matches the constant used in `kbn-content-list-toolbar` and `table_list_view_table`.
 */
const NULL_USER = 'no-user';

/**
 * Result of resolving user filter values.
 */
interface ResolvedUserFilters {
  /** Resolved UIDs to match against `item.createdBy`. */
  uids: string[];
  /** Whether to include items with no creator (createdBy is undefined). */
  includeNoCreator: boolean;
}

/**
 * Resolves user filter values to UIDs using the lookup map.
 * Returns UIDs for all resolvable values and whether to include items with no creator.
 */
const resolveUserFiltersToUids = (
  filterValues: string[],
  lookupMap: Map<string, string>
): ResolvedUserFilters => {
  const resolvedUids: string[] = [];
  let includeNoCreator = false;

  for (const value of filterValues) {
    // Check for the special "no-user" sentinel value.
    if (value === NULL_USER) {
      includeNoCreator = true;
      continue;
    }

    // Try lowercase lookup (for username/email).
    const uid = lookupMap.get(value.toLowerCase()) ?? lookupMap.get(value);
    if (uid) {
      resolvedUids.push(uid);
    }
  }

  return { uids: resolvedUids, includeNoCreator };
};

/**
 * Creates a `FindItemsFn` adapter that wraps an existing `TableListView`-style `findItems` function.
 *
 * This adapter enables consumers to migrate from `TableListView` to `ContentListProvider`
 * with minimal changes - they simply pass their existing `findItems` function.
 *
 * The adapter:
 * - Accepts the new structured `FindItemsParams`.
 * - Maps `filters.tags` to `references` / `referencesToExclude`.
 * - **Caches results** and only calls consumer's `findItems` when search/tags change.
 * - Returns from cache when only sort/page change (no server re-fetch).
 * - **Resolves usernames/emails to UIDs** using cached user profiles (when `bulkGetUserProfiles` is provided).
 * - Applies client-side user filtering (since `TableListView` doesn't support this).
 * - Applies client-side sorting.
 * - Applies client-side pagination.
 *
 * This matches the original `TableListView` behavior where sorting and pagination
 * are handled client-side by EuiInMemoryTable after fetching all items once.
 *
 * @template T The item type returned by the consumer's `findItems` function.
 * @param options - Configuration options containing the consumer's `findItems` function.
 * @returns An object containing the adapted `findItems` function.
 *
 * @example
 * ```tsx
 * import { createFindItemsAdapter } from '@kbn/content-list-provider-client';
 *
 * // Your existing findItems function from TableListView.
 * const existingFindItems = async (searchQuery, refs) => {
 *   return dashboardClient.search({ search: searchQuery, ...refs });
 * };
 *
 * // Create the adapter with user profile resolution.
 * const { findItems } = createFindItemsAdapter({
 *   findItems: existingFindItems,
 *   bulkGetUserProfiles: (uids) => coreServices.userProfile.bulkGet({ uids: new Set(uids) }),
 * });
 * ```
 */
export const createFindItemsAdapter = <T extends UserContentCommonSchema>({
  findItems: consumerFindItems,
  bulkGetUserProfiles,
}: CreateFindItemsAdapterOptions<T>): CreateFindItemsAdapterResult<T> => {
  // Cache for raw results from consumer's findItems.
  // Only re-fetch when search/tags change; sort/page are handled client-side.
  let cachedFetchKey: string | null = null;
  let cachedResult: { hits: T[]; total: number } | null = null;

  // Cache for user lookup map (username/email → UID).
  // Built from user profiles fetched for items in the current result set.
  let cachedUserLookupMap: Map<string, string> = new Map();

  const findItems: FindItemsFn<T> = async ({
    searchQuery,
    filters,
    sort,
    page,
  }: FindItemsParams): Promise<FindItemsResult<T>> => {
    try {
      // Map tag filters to the TableListView references format.
      const tagIds = filters.tags?.include;
      const tagIdsToExclude = filters.tags?.exclude;
      const references = tagIds?.map((tagId) => ({
        type: 'tag',
        id: tagId,
      }));
      const referencesToExclude = tagIdsToExclude?.map((tagId) => ({
        type: 'tag',
        id: tagId,
      }));

      // Generate cache key based on search/tags only (not sort/page).
      const fetchKey = generateFetchKey(searchQuery, tagIds, tagIdsToExclude);

      // Check if we can use cached result.
      // Only re-fetch if search or tags changed.
      if (fetchKey !== cachedFetchKey || !cachedResult) {
        // Call the consumer's existing findItems function.
        const result = await consumerFindItems(searchQuery, {
          references: references?.length ? references : undefined,
          referencesToExclude: referencesToExclude?.length ? referencesToExclude : undefined,
        });

        // Cache the raw result.
        cachedFetchKey = fetchKey;
        cachedResult = result;

        // Build user lookup map from fetched items (if user profile service is available).
        if (bulkGetUserProfiles) {
          // Collect unique createdBy UIDs from items.
          const uniqueUids = [
            ...new Set(result.hits.map((item) => item.createdBy).filter(Boolean) as string[]),
          ];

          if (uniqueUids.length > 0) {
            try {
              const profiles = await bulkGetUserProfiles(uniqueUids);
              cachedUserLookupMap = buildUserLookupMap(profiles);
            } catch {
              // If profile fetch fails, continue with empty lookup map.
              // User filtering will fall back to direct UID comparison.
              cachedUserLookupMap = new Map();
            }
          } else {
            cachedUserLookupMap = new Map();
          }
        }
      }

      // Use cached data for client-side processing.
      let items = [...cachedResult.hits];
      let filteredTotal = cachedResult.total;

      // Apply client-side user filtering.
      // TableListView consumers don't support user filtering, so we do it here.
      if (filters.users && filters.users.length > 0) {
        // Resolve filter values to UIDs using cached lookup map.
        // This handles cases where users type `createdBy:username` in the search bar.
        const { uids: resolvedUids, includeNoCreator } =
          cachedUserLookupMap.size > 0
            ? resolveUserFiltersToUids(filters.users, cachedUserLookupMap)
            : { uids: filters.users, includeNoCreator: filters.users.includes(NULL_USER) };

        if (resolvedUids.length > 0 || includeNoCreator) {
          items = items.filter((item) => {
            // Check for items with no creator (matches "No creators" filter option).
            if (!item.createdBy) {
              // Match items without creator if "no-user" filter is active.
              // Exclude managed items (they don't have creators by design).
              return includeNoCreator && !item.managed;
            }
            // Match items where createdBy is in the resolved UIDs.
            return resolvedUids.includes(item.createdBy);
          });
        } else {
          // No resolvable users and no "no creator" filter means no matches.
          items = [];
        }
        // Update total to reflect client-side filtered count.
        filteredTotal = items.length;
      }

      // Apply client-side sorting.
      if (sort.field) {
        const sortDirection = sort.direction ?? 'asc';
        items = sortItems(items, sort.field, sortDirection, getUserContentFieldValue);
      }

      // When starredOnly is active, return ALL items (no pagination).
      // The state provider will filter by starred reactively using favoritesData,
      // then paginate. This enables reactive updates when favorites change.
      if (filters.starredOnly) {
        return {
          items,
          total: filteredTotal,
        };
      }

      // Apply client-side pagination for non-starred queries.
      const startIdx = page.index * page.size;
      const endIdx = startIdx + page.size;
      const paginatedItems = items.slice(startIdx, endIdx);

      return {
        items: paginatedItems,
        total: filteredTotal,
      };
    } catch (e) {
      // Don't log abort errors - they're expected during navigation.
      if (e instanceof Error && e.name === 'AbortError') {
        return { items: [], total: 0 };
      }
      // eslint-disable-next-line no-console
      console.error('Error in findItems adapter:', e);
      return {
        items: [],
        total: 0,
      };
    }
  };

  /**
   * Clears all internal caches.
   * Call before refetch to ensure fresh data is fetched from the server.
   */
  const clearCache = () => {
    cachedFetchKey = null;
    cachedResult = null;
    cachedUserLookupMap = new Map();
  };

  return { findItems, clearCache };
};
