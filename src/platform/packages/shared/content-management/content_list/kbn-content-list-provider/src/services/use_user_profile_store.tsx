/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ContentListUserProfilesServices, UserProfileEntry, UserProfileStore } from './types';

/**
 * React context for the shared {@link UserProfileStore}.
 *
 * `undefined` when user profiles are not configured.
 */
const UserProfileStoreContext = createContext<UserProfileStore | undefined>(undefined);

/**
 * Hook to access the shared {@link UserProfileStore} from context.
 *
 * Returns `undefined` when user profiles are not configured.
 */
export const useUserProfileStoreContext = (): UserProfileStore | undefined =>
  useContext(UserProfileStoreContext);

/**
 * Props for {@link UserProfileStoreProvider}.
 */
interface UserProfileStoreProviderProps {
  service: ContentListUserProfilesServices | undefined;
  queryKeyScope: string;
  children: React.ReactNode;
}

/**
 * Provider that creates and owns the shared {@link UserProfileStore}.
 *
 * Matches the integration pattern used by tags (`ContentManagementTagsProvider`)
 * and favorites (`FavoritesContextProvider`).
 */
export const UserProfileStoreProvider = ({
  service,
  queryKeyScope,
  children,
}: UserProfileStoreProviderProps): JSX.Element => {
  const store = useUserProfileStore(service, queryKeyScope);
  return (
    <UserProfileStoreContext.Provider value={store}>{children}</UserProfileStoreContext.Provider>
  );
};

/**
 * Hook that creates a shared {@link UserProfileStore}.
 *
 * The store provides synchronous reads from a cache that is populated
 * asynchronously via the {@link ContentListUserProfilesServices} methods.
 * State updates trigger React re-renders in consumers that depend on the store.
 *
 * @param service - The async user profile service.
 * @param _queryKeyScope - Scope identifier, unused today. Reserved for future
 *   React Query–keyed caching so that multiple content lists on the same page
 *   can maintain independent profile caches. Remove the underscore prefix when
 *   this parameter is wired up.
 * @returns A `UserProfileStore`, or `undefined` if the service is not provided.
 */
const useUserProfileStore = (
  service: ContentListUserProfilesServices | undefined,
  _queryKeyScope: string
): UserProfileStore | undefined => {
  const [cache, setCache] = useState<Map<string, UserProfileEntry>>(new Map());

  // Ref mirror of the cache for read-only operations in stable callbacks.
  // `ensureLoaded` and `resolveDisplayValues` only read the cache for
  // diffing (checking which UIDs are missing). Using a ref prevents them
  // from recreating on every cache update, which would cascade a new
  // context value and re-render the entire content list tree.
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const mergeEntries = useCallback((entries: UserProfileEntry[]) => {
    setCache((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const entry of entries) {
        if (!prev.has(entry.uid)) {
          next.set(entry.uid, entry);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  // `getAll` and `resolve` close over `cache` (not the ref) so consumers
  // that call them re-render when new profiles are loaded.
  const getAll = useCallback((): UserProfileEntry[] => {
    return Array.from(cache.values());
  }, [cache]);

  const resolve = useCallback(
    (uid: string): UserProfileEntry | undefined => {
      return cache.get(uid);
    },
    [cache]
  );

  // Track UIDs that are already being fetched so concurrent `ensureLoaded`
  // calls (e.g. from profile priming and per-page seeding firing in the
  // same render cycle) don't issue duplicate `bulkResolve` requests.
  const inflightRef = useRef(new Set<string>());

  const ensureLoaded = useCallback(
    async (uids: string[]): Promise<void> => {
      if (!service) {
        return;
      }
      const missing = uids.filter(
        (uid) => !cacheRef.current.has(uid) && !inflightRef.current.has(uid)
      );
      if (missing.length === 0) {
        return;
      }
      for (const uid of missing) {
        inflightRef.current.add(uid);
      }
      try {
        const resolved = await service.bulkResolve(missing);
        mergeEntries(resolved);
      } finally {
        for (const uid of missing) {
          inflightRef.current.delete(uid);
        }
      }
    },
    [service, mergeEntries]
  );

  const resolveDisplayValues = useCallback(
    async (displayValues: string[]): Promise<void> => {
      if (!service?.suggest || displayValues.length === 0) {
        return;
      }
      // Build a O(1) lookup set from cached display fields so we avoid
      // an O(displayValues × cacheSize) scan on every call.
      const knownKeys = new Set<string>();
      for (const entry of cacheRef.current.values()) {
        knownKeys.add(entry.uid.toLowerCase());
        knownKeys.add(entry.email.toLowerCase());
        knownKeys.add(entry.fullName.toLowerCase());
        knownKeys.add(entry.user.username.toLowerCase());
      }
      const unresolved = displayValues.filter((dv) => !knownKeys.has(dv.toLowerCase()));
      if (unresolved.length === 0) {
        return;
      }
      const results = await Promise.all(unresolved.map((v) => service.suggest!(v)));
      mergeEntries(results.flat());
    },
    [service, mergeEntries]
  );

  return useMemo(() => {
    if (!service) {
      return undefined;
    }
    return { getAll, resolve, ensureLoaded, merge: mergeEntries, resolveDisplayValues };
  }, [service, getAll, resolve, ensureLoaded, mergeEntries, resolveDisplayValues]);
};
