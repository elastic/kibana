/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import {
  useFilterMetadata,
  useContentListUserFilter,
  MANAGED_USER_FILTER,
  NO_CREATOR_USER_FILTER,
  type FilterFacet,
} from '@kbn/content-list-provider';
import type { UserProfile } from '@kbn/user-profile-components';
import { MANAGED_QUERY_VALUE, NO_CREATOR_QUERY_VALUE } from '@kbn/content-list-provider';

/**
 * Return value from {@link useCreatorProfiles}.
 */
export interface UseCreatorProfilesReturn {
  /** Display-ready facets from `getMetadata`. `undefined` while loading. */
  facets: FilterFacet[] | undefined;
  /** Whether the metadata query is currently loading. */
  isLoading: boolean;
  /** UIDs currently selected (including sentinel values). */
  selectedCreators: readonly string[];
  /**
   * `true` when the resolver can attempt UID resolution. Always `true`
   * because sentinel mappings are seeded unconditionally and the suggest
   * fallback handles real user values before facets are loaded.
   */
  isReady: boolean;
  /** Maps a UID (or sentinel) to its query-bar display string. */
  uidToQueryValue: Map<string, string>;
  /** Maps a lowercased email/username/sentinel to the corresponding UID. */
  emailToUid: Map<string, string>;
}

interface LookupMaps {
  uidToQueryValue: Map<string, string>;
  emailToUid: Map<string, string>;
}

/**
 * Build lookup maps from filter facets in a single pass.
 *
 * Sentinel values (`managed`, `none`) are seeded so the resolver can
 * map them to UIDs without special-case logic.
 *
 * For user facets, the `data.user` object provides email and username for resolution.
 */
const buildLookupMaps = (facets: readonly FilterFacet[]): LookupMaps => {
  const uidToQueryValue = new Map<string, string>();
  const emailToUid = new Map<string, string>();

  uidToQueryValue.set(MANAGED_USER_FILTER, MANAGED_QUERY_VALUE);
  uidToQueryValue.set(NO_CREATOR_USER_FILTER, NO_CREATOR_QUERY_VALUE);
  emailToUid.set(MANAGED_QUERY_VALUE, MANAGED_USER_FILTER);
  emailToUid.set(NO_CREATOR_QUERY_VALUE, NO_CREATOR_USER_FILTER);

  for (const facet of facets) {
    const user = facet.data?.user as UserProfile['user'] | undefined;
    if (!user) {
      continue;
    }
    const { key: uid } = facet;
    if (!uidToQueryValue.has(uid)) {
      uidToQueryValue.set(uid, user.email ?? user.username);
    }
    const { email, username } = user;
    if (email && !emailToUid.has(email.toLowerCase())) {
      emailToUid.set(email.toLowerCase(), uid);
    }
    if (username && !emailToUid.has(username.toLowerCase())) {
      emailToUid.set(username.toLowerCase(), uid);
    }
  }

  return { uidToQueryValue, emailToUid };
};

/**
 * Fetches and indexes user profiles for the "Created by" filter.
 *
 * Consumes `useFilterMetadata('createdBy')` to get display-ready facets from
 * the provider's `getMetadata` implementation. Builds lookup maps for the
 * query-bar resolver.
 *
 * @param popoverOpen - When `true`, enables the metadata query so it fires lazily on popover open.
 */
export const useCreatorProfiles = (popoverOpen: boolean): UseCreatorProfilesReturn => {
  const { selectedUsers: selectedCreators } = useContentListUserFilter();
  const metadataQuery = useFilterMetadata('createdBy', { enabled: popoverOpen });

  const { facets } = metadataQuery.data ? { facets: metadataQuery.data } : { facets: undefined };

  const { uidToQueryValue, emailToUid } = useMemo(() => buildLookupMaps(facets ?? []), [facets]);

  return {
    facets,
    isLoading: metadataQuery.isLoading,
    selectedCreators,
    // Always ready: sentinel mappings are seeded unconditionally by
    // `buildLookupMaps`, and the suggest fallback in the resolver handles
    // real user values before the popover has been opened. Once facets load,
    // `emailToUid` gains full user mappings and the effect re-runs.
    isReady: true,
    uidToQueryValue,
    emailToUid,
  };
};
