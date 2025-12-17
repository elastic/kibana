/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LRUCache } from 'lru-cache';
import type { UserInfo } from './types';

/**
 * Maximum number of user profiles to cache.
 * This should accommodate most typical deployments where a limited number
 * of users are actively creating/updating content.
 */
const CACHE_MAX_SIZE = 1000;

/**
 * Time-to-live for cached user profiles (5 minutes).
 * User profile data (username, email, avatar) changes infrequently,
 * so a 5-minute TTL provides a good balance between freshness and performance.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

let isCacheEnabled = true;

/**
 * Disables the user profile cache.
 * Used in tests to ensure deterministic behavior.
 */
export const disableUserProfileCache = (): void => {
  isCacheEnabled = false;
};

/**
 * Enables the user profile cache.
 * Used to restore caching after tests that disabled it.
 */
export const enableUserProfileCache = (): void => {
  isCacheEnabled = true;
};

/**
 * Clears all entries from the user profile cache.
 * Useful for tests or when user data is known to have changed.
 */
export const clearUserProfileCache = (): void => {
  userProfileCache.clear();
};

/**
 * Module-level LRU cache for user profile information.
 * Keyed by user profile UID, stores {@link UserInfo} objects.
 */
const userProfileCache = new LRUCache<string, UserInfo>({
  max: CACHE_MAX_SIZE,
  ttl: CACHE_TTL_MS,
});

/**
 * Retrieves a user profile from the cache.
 *
 * @param uid - User profile UID to look up.
 * @returns Cached {@link UserInfo} if present and not expired, `undefined` otherwise.
 */
export const getCachedUserProfile = (uid: string): UserInfo | undefined => {
  if (!isCacheEnabled) {
    return undefined;
  }
  return userProfileCache.get(uid);
};

/**
 * Stores a user profile in the cache.
 *
 * @param uid - User profile UID.
 * @param userInfo - User profile information to cache.
 */
export const setCachedUserProfile = (uid: string, userInfo: UserInfo): void => {
  if (!isCacheEnabled) {
    return;
  }
  userProfileCache.set(uid, userInfo);
};

/**
 * Retrieves multiple user profiles from the cache.
 * Returns only the profiles that are cached; uncached UIDs are omitted.
 *
 * @param uids - Array of user profile UIDs to look up.
 * @returns Map of UID to {@link UserInfo} for cached entries only.
 */
export const getCachedUserProfiles = (uids: string[]): Map<string, UserInfo> => {
  const result = new Map<string, UserInfo>();
  if (!isCacheEnabled) {
    return result;
  }
  for (const uid of uids) {
    const cached = userProfileCache.get(uid);
    if (cached) {
      result.set(uid, cached);
    }
  }
  return result;
};

/**
 * Stores multiple user profiles in the cache.
 *
 * @param profiles - Map of UID to {@link UserInfo} to cache.
 */
export const setCachedUserProfiles = (profiles: Map<string, UserInfo>): void => {
  if (!isCacheEnabled) {
    return;
  }
  for (const [uid, userInfo] of profiles) {
    userProfileCache.set(uid, userInfo);
  }
};
