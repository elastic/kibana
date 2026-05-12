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
import {
  MANAGED_USER_FILTER,
  NO_CREATOR_USER_FILTER,
  MANAGED_USER_LABEL,
  NO_CREATOR_USER_LABEL,
  SENTINEL_KEYS,
} from '../item';
import { useProfileCache, useProfileCacheVersion } from '../services';
import type { ProfileCache } from '../services';
import type { FieldDefinition, FlagDefinition } from './types';

const SENTINEL_LABELS: Record<string, string> = {
  [MANAGED_USER_FILTER]: MANAGED_USER_LABEL,
  [NO_CREATOR_USER_FILTER]: NO_CREATOR_USER_LABEL,
};

/** Reverse map from display label to sentinel key (e.g. `'Managed'` → `'__managed__'`). */
const SENTINEL_LABELS_TO_KEYS: Record<string, string> = Object.fromEntries(
  Object.entries(SENTINEL_LABELS).map(([key, label]) => [label, key])
);

/**
 * Creates a {@link FieldDefinition} for a user-UID-based field (e.g. `createdBy`,
 * `updatedBy`) that resolves UIDs <-> emails via the shared profile cache.
 *
 * Sentinel values (`__managed__`, `__no_creator__`) are recognized and resolve
 * immediately — they never trigger profile priming.
 */
const makeUserFieldDefinition = (fieldName: string, cache: ProfileCache): FieldDefinition => ({
  fieldName,
  resolveIdToDisplay: (uid: string) => {
    if (SENTINEL_KEYS.has(uid)) {
      return SENTINEL_LABELS[uid];
    }
    const user = cache.resolve(uid);
    return user?.email || user?.fullName || uid;
  },
  resolveDisplayToId: (display: string) => {
    // Sentinel keys resolve to themselves (e.g. `__managed__` → `__managed__`).
    if (SENTINEL_KEYS.has(display)) {
      return display;
    }
    // Sentinel display labels resolve to their keys (e.g. `Managed` → `__managed__`).
    const sentinelKey = SENTINEL_LABELS_TO_KEYS[display];
    if (sentinelKey) {
      return sentinelKey;
    }
    // Check for a direct UID match first — handles the case where
    // `resolveIdToDisplay` fell back to the raw UID (profile not yet cached)
    // and the UID was written into queryText.
    const byUid = cache.resolve(display);
    if (byUid) {
      return byUid.uid;
    }
    const lower = display.toLowerCase();
    return cache
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
    return cache
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
 * with the field name and the shared profile cache.
 */
export const useFieldDefinitions = (): {
  fields: FieldDefinition[];
  flags: FlagDefinition[];
  /**
   * Stable list of registered field names (e.g. `['tag', 'createdBy']`).
   *
   * Unlike `fields` (which updates when resolver functions change — e.g. the
   * profile cache loads data), `fieldNames` only changes when the *set* of
   * registered fields changes (feature flags toggled, services added/removed).
   * This keeps the search bar schema stable across async profile loading.
   */
  fieldNames: string[];
} => {
  const { services, supports, features } = useContentListConfig();
  const profileCache = useProfileCache();
  const cacheVersion = useProfileCacheVersion();
  const tagsService = services?.tags;

  // Booleans for whether each feature is enabled — drives field name stability.
  const hasTags = supports.tags && !!tagsService?.getTagList;
  const hasUserProfiles = supports.userProfiles && !!profileCache;

  // Field names are stable — they depend only on feature flags and service
  // existence, NOT on the profile cache's contents.
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

  // Full definitions with resolver functions — updates when the cache version
  // changes so that `useQueryModel` can resolve UIDs <-> emails.
  // `cacheVersion` is unused in the body but must be a dependency to trigger
  // recomputation when profiles load (the cache reference itself is stable).
  const { fields, flags } = useMemo(() => {
    void cacheVersion;
    const f: FieldDefinition[] = [];
    const fl: FlagDefinition[] = [];

    // Tag field — resolve tag IDs <-> tag names.
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

    // User-UID-based fields — resolve UIDs <-> emails via the shared profile cache.
    if (hasUserProfiles && profileCache) {
      f.push(makeUserFieldDefinition('createdBy', profileCache));
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
    profileCache,
    cacheVersion,
    features.fields,
    features.flags,
  ]);

  return { fields, flags, fieldNames };
};
