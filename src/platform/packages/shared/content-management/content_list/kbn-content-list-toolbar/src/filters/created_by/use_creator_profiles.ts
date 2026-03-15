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
  useContentListItems,
  useContentListUserFilter,
  MANAGED_USER_FILTER,
  NO_CREATOR_USER_FILTER,
} from '@kbn/content-list-provider';
import { useUserProfiles } from '@kbn/content-management-user-profiles';
import type { UserProfile } from '@kbn/user-profile-components';
import type { CreatorsList } from '@kbn/content-list-provider';
import { MANAGED_QUERY_VALUE, NO_CREATOR_QUERY_VALUE } from './constants';

/**
 * Return value from {@link useCreatorProfiles}.
 */
export interface UseCreatorProfilesReturn {
  /** Summary of all unique creators from the item set. */
  allCreators: CreatorsList;
  /** UIDs currently selected (including sentinel values). */
  selectedCreators: readonly string[];
  /** Resolved profiles for real creators. `undefined` while loading or on error. */
  resolvedCreators: readonly UserProfile[] | undefined;
  /**
   * `true` when profile data is available for UID resolution.
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
 * Build lookup maps from resolved profiles in a single pass.
 *
 * Sentinel values (`managed`, `none`) are seeded so the resolver can
 * map them to UIDs without special-case logic.
 *
 * Phase 2 adds a `queryValueToUids` map here for full-name matching.
 */
const buildLookupMaps = (profiles: readonly UserProfile[]): LookupMaps => {
  const uidToQueryValue = new Map<string, string>();
  const emailToUid = new Map<string, string>();

  uidToQueryValue.set(MANAGED_USER_FILTER, MANAGED_QUERY_VALUE);
  uidToQueryValue.set(NO_CREATOR_USER_FILTER, NO_CREATOR_QUERY_VALUE);
  emailToUid.set(MANAGED_QUERY_VALUE, MANAGED_USER_FILTER);
  emailToUid.set(NO_CREATOR_QUERY_VALUE, NO_CREATOR_USER_FILTER);

  for (const { uid, user } of profiles) {
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
 * Combines two UID sources:
 * - `allCreators.uids` — creators visible in the current item set.
 * - `selectedCreators` — UIDs from the active user filter that may no
 *   longer appear in `allCreators` when a search narrows the result set.
 *
 * Sentinel values are excluded from the profile fetch (they are not real
 * user IDs) and seeded directly into the lookup maps.
 *
 * Phase 2 adds `useSuggestUserProfiles` and a `queryValueToUids` map here.
 */
export const useCreatorProfiles = (): UseCreatorProfilesReturn => {
  const { allCreators } = useContentListItems();
  const { selectedUsers: selectedCreators } = useContentListUserFilter();

  const profileUids = useMemo(() => {
    const uids = new Set([...allCreators.uids, ...selectedCreators]);
    uids.delete(MANAGED_USER_FILTER);
    uids.delete(NO_CREATOR_USER_FILTER);
    return Array.from(uids);
  }, [allCreators.uids, selectedCreators]);

  const profilesQuery = useUserProfiles(profileUids);

  const { uidToQueryValue, emailToUid } = useMemo(
    () => buildLookupMaps(profilesQuery.data ?? []),
    [profilesQuery.data]
  );

  return {
    allCreators,
    selectedCreators,
    resolvedCreators: profilesQuery.data,
    isReady: !!profilesQuery.data,
    uidToQueryValue,
    emailToUid,
  };
};
