/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';
import { useUserProfiles } from '@kbn/content-management-user-profiles';
import type { ContentListItem } from '../../item';
import type { IdentityResolver } from './use_identity_resolver';

/**
 * User info structure from server-side enrichment.
 */
interface UserInfo {
  username: string;
  email?: string;
}

/** Item enriched with user info from server-side. */
type EnrichedItem = ContentListItem & { createdByUser?: UserInfo; updatedByUser?: UserInfo };

/**
 * Type predicate to check if an item has server-side user enrichment.
 * Items with `createdByUser` or `updatedByUser` have already been enriched.
 */
const isEnrichedItem = (item: ContentListItem): item is EnrichedItem =>
  'createdByUser' in item || 'updatedByUser' in item;

/**
 * Resolved filter mappings returned from the server.
 */
interface ResolvedFilters {
  createdBy?: Record<string, string>;
}

/**
 * Data returned from the content list query.
 */
interface QueryData {
  items: ContentListItem[];
  resolvedFilters?: ResolvedFilters;
}

/**
 * Options for the `useUserEnrichment` hook.
 */
export interface UseUserEnrichmentOptions {
  /** Data from the content list query. */
  data: QueryData | undefined;
  /** Identity resolver for createdBy filter deduplication. */
  identityResolver: IdentityResolver;
}

/**
 * Hook to handle user profile enrichment and identity resolution for content list items.
 *
 * This hook manages two scenarios:
 *
 * 1. **Server-side enrichment**: When items already have `createdByUser`/`updatedByUser`,
 *    the hook extracts usernames and emails to register with the identity resolver.
 *
 * 2. **Client-side enrichment**: When items only have UIDs (`createdBy`/`updatedBy`),
 *    the hook fetches user profiles via `useUserProfiles` and registers the mappings.
 *
 * The identity resolver is used to deduplicate `createdBy` filter values (e.g., mapping
 * both "jdoe" and "john.doe@elastic.co" to the same UID).
 *
 * @param options - Options including query data and identity resolver.
 *
 * @example
 * ```tsx
 * const identityResolver = useIdentityResolver();
 *
 * const { data } = useContentListItemsQuery({ ... });
 *
 * // Enrich user info and populate identity resolver.
 * useUserEnrichment({ data, identityResolver });
 * ```
 */
export const useUserEnrichment = ({ data, identityResolver }: UseUserEnrichmentOptions): void => {
  // Check if items already have createdByUser/updatedByUser populated (server provider does this).
  // Only fetch user profiles if items don't have this info (client provider case).
  const { userIdsToFetch, hasUserInfo } = useMemo(() => {
    if (!data?.items || data.items.length === 0) {
      return { userIdsToFetch: [], hasUserInfo: false };
    }

    // Check if any item has createdByUser or updatedByUser - if so, profiles are already available.
    const itemWithUserInfoFound = data.items.some(isEnrichedItem);

    if (itemWithUserInfoFound) {
      return { userIdsToFetch: [], hasUserInfo: true };
    }

    // No user info available - collect unique UIDs from both createdBy and updatedBy.
    const ids = new Set<string>();
    for (const item of data.items) {
      if (item.createdBy) {
        ids.add(item.createdBy);
      }
      if (item.updatedBy) {
        ids.add(item.updatedBy);
      }
    }
    return { userIdsToFetch: Array.from(ids), hasUserInfo: false };
  }, [data?.items]);

  // Fetch user profiles only when items don't have user info (client provider case).
  const userProfilesQuery = useUserProfiles(userIdsToFetch, {
    enabled: userIdsToFetch.length > 0,
  });

  // Populate identity resolver when data arrives (from items with createdByUser/updatedByUser).
  useEffect(() => {
    if (!data || !hasUserInfo) {
      return;
    }

    // Register mappings from resolvedFilters (input -> UID).
    if (data.resolvedFilters?.createdBy) {
      identityResolver.registerAll(data.resolvedFilters.createdBy);
    }

    // Register mappings from items (username/email -> UID).
    // Both createdByUser and updatedByUser share user info, so register both.
    for (const item of data.items) {
      if (!isEnrichedItem(item)) {
        continue;
      }

      const { createdBy, updatedBy, createdByUser, updatedByUser } = item;

      // Register createdBy user info.
      if (createdBy && createdByUser) {
        identityResolver.register(createdByUser.username, createdBy);
        if (createdByUser.email) {
          identityResolver.register(createdByUser.email, createdBy);
        }
      }

      // Register updatedBy user info.
      if (updatedBy && updatedByUser) {
        identityResolver.register(updatedByUser.username, updatedBy);
        if (updatedByUser.email) {
          identityResolver.register(updatedByUser.email, updatedBy);
        }
      }
    }
  }, [data, hasUserInfo, identityResolver]);

  // Populate resolver from fetched user profiles (client provider case).
  useEffect(() => {
    if (!userProfilesQuery.data || hasUserInfo) {
      return;
    }

    // Register all fetched profiles - they apply to both createdBy and updatedBy.
    for (const profile of userProfilesQuery.data) {
      const { uid } = profile;
      const username = profile.user?.username;
      const email = profile.user?.email;

      if (uid && username) {
        identityResolver.register(username, uid);
      }
      if (uid && email) {
        identityResolver.register(email, uid);
      }
    }
  }, [userProfilesQuery.data, hasUserInfo, identityResolver]);
};
