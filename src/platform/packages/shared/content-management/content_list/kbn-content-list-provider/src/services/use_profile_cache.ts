/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import type { ProfileCache } from './profile_cache';
import type { UserProfileEntry } from './types';

const noOpSubscribe = () => () => {};
const noOpSnapshot = () => 0;

/**
 * React context for the shared {@link ProfileCache}.
 *
 * `undefined` when user profiles are not configured.
 */
export const ProfileCacheContext = createContext<ProfileCache | undefined>(undefined);

/**
 * Get the {@link ProfileCache} instance (stable, never changes identity).
 *
 * Returns `undefined` when user profiles are not configured.
 */
export const useProfileCache = (): ProfileCache | undefined => useContext(ProfileCacheContext);

/**
 * Subscribe to cache version changes.
 *
 * Re-renders only when profiles are actually loaded (version bumps).
 * Use alongside `useProfileCache()` when you need reactive access to
 * the cache contents (e.g. field definitions that recompute on cache change).
 */
export const useProfileCacheVersion = (): number => {
  const cache = useProfileCache();
  return useSyncExternalStore(
    cache?.subscribe ?? noOpSubscribe,
    cache?.getSnapshot ?? noOpSnapshot
  );
};

/**
 * Resolve a single profile by UID. Self-loading — triggers a batched load
 * if the profile is not yet cached.
 *
 * Multiple cells calling `useProfile` in the same render frame get their
 * requests batched into a single `bulkResolve` (50ms window via
 * `createBatcher`).
 */
export const useProfile = (uid: string | undefined): UserProfileEntry | undefined => {
  const cache = useProfileCache();
  useProfileCacheVersion(); // subscribe to updates

  useEffect(() => {
    if (uid && cache && !cache.resolve(uid)) {
      cache.loadOne(uid).catch(() => {});
    }
  }, [uid, cache]);

  return uid ? cache?.resolve(uid) : undefined;
};
