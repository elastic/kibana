/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useContentListConfig } from '../context';
import { useUserProfileStoreContext, type UserProfileStore } from '../services';
import type { FieldDefinition, FlagDefinition } from './types';

/**
 * Creates a {@link FieldDefinition} for a user-UID-based field (e.g. `createdBy`,
 * `updatedBy`) that resolves UIDs ↔ emails via the shared profile store.
 */
const makeUserFieldDefinition = (fieldName: string, store: UserProfileStore): FieldDefinition => ({
  fieldName,
  resolveIdToDisplay: (uid: string) => {
    const user = store.resolve(uid);
    return user?.email || user?.fullName || uid;
  },
  resolveDisplayToId: (display: string) => {
    // Check for a direct UID match first — handles the case where
    // `resolveIdToDisplay` fell back to the raw UID (profile not yet cached)
    // and the UID was written into queryText. Once the profile is later
    // loaded, this avoids marking the field as "unresolved."
    const byUid = store.resolve(display);
    if (byUid) {
      return byUid.uid;
    }
    const lower = display.toLowerCase();
    return store
      .getAll()
      .find(
        (u) =>
          u.email.toLowerCase() === lower ||
          u.fullName.toLowerCase() === lower ||
          u.user.username.toLowerCase() === lower
      )?.uid;
  },
  resolveFuzzyDisplayToIds: (partial: string) => {
    const lower = partial.toLowerCase();
    return store
      .getAll()
      .filter(
        (u) =>
          u.email.toLowerCase().includes(lower) ||
          u.fullName.toLowerCase().includes(lower) ||
          u.user.username.toLowerCase().includes(lower)
      )
      .map((u) => u.uid);
  },
});

/**
 * Hook that builds {@link FieldDefinition} and {@link FlagDefinition} arrays
 * from the services and support flags registered on the provider.
 *
 * Adding a new user-field filter only requires calling `makeUserFieldDefinition`
 * with the field name and the shared profile store.
 */
export const useFieldDefinitions = (): {
  fields: FieldDefinition[];
  flags: FlagDefinition[];
  /**
   * Stable list of registered field names (e.g. `['tag', 'createdBy']`).
   *
   * Unlike `fields` (which updates when resolver functions change — e.g. the
   * profile store loads data), `fieldNames` only changes when the *set* of
   * registered fields changes (feature flags toggled, services added/removed).
   * This keeps the search bar schema stable across async profile loading.
   */
  fieldNames: string[];
} => {
  const { services, supports, features } = useContentListConfig();
  const userProfileStore = useUserProfileStoreContext();
  const tagsService = services?.tags;

  // Booleans for whether each feature is enabled — drives field name stability.
  const hasTags = supports.tags && !!tagsService?.getTagList;
  const hasUserProfiles = supports.userProfiles && !!userProfileStore;

  // Field names are stable — they depend only on feature flags and service
  // existence, NOT on the profile store's cached data.
  const fieldNames = useMemo(() => {
    const names: string[] = [];
    if (hasTags) {
      names.push('tag');
    }
    if (hasUserProfiles) {
      names.push('createdBy');
    }
    if (features.fields) {
      for (const cf of features.fields) {
        names.push(cf.fieldName);
      }
    }
    return names;
  }, [hasTags, hasUserProfiles, features.fields]);

  // Full definitions with resolver functions — updates when the store's cached
  // data changes so that `useQueryModel` can resolve UIDs ↔ emails.
  const { fields, flags } = useMemo(() => {
    const f: FieldDefinition[] = [];
    const fl: FlagDefinition[] = [];

    // Tag field — resolve tag IDs ↔ tag names.
    if (hasTags && tagsService?.getTagList) {
      const getTagList = tagsService.getTagList;
      f.push({
        fieldName: 'tag',
        resolveIdToDisplay: (id: string) => {
          const tags = getTagList();
          return tags.find((t) => t.id === id)?.name ?? id;
        },
        resolveDisplayToId: (name: string) => {
          const tags = getTagList();
          return tags.find((t) => t.name === name)?.id;
        },
        resolveFuzzyDisplayToIds: (partial: string) => {
          const lower = partial.toLowerCase();
          return getTagList()
            .filter((t) => t.name.toLowerCase().includes(lower))
            .map((t) => t.id)
            .filter((id): id is string => id !== undefined);
        },
      });
    }

    // User-UID-based fields — resolve UIDs ↔ emails via the shared profile store.
    if (hasUserProfiles && userProfileStore) {
      f.push(makeUserFieldDefinition('createdBy', userProfileStore));
    }

    // Consumer-provided custom field definitions.
    if (features.fields) {
      f.push(...features.fields);
    }

    // Starred flag.
    if (supports.starred) {
      fl.push({ flagName: 'starred', modelKey: 'starred' });
    }

    // Consumer-provided custom flag definitions.
    if (features.flags) {
      fl.push(...features.flags);
    }

    return { fields: f, flags: fl };
  }, [
    hasTags,
    hasUserProfiles,
    supports.starred,
    tagsService,
    userProfileStore,
    features.fields,
    features.flags,
  ]);

  return { fields, flags, fieldNames };
};
