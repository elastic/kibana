/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserInfo } from './types';
import {
  getCachedUserProfile,
  setCachedUserProfile,
  getCachedUserProfiles,
  setCachedUserProfiles,
  clearUserProfileCache,
  disableUserProfileCache,
  enableUserProfileCache,
} from './user_profile_cache';

describe('user_profile_cache', () => {
  beforeEach(() => {
    // Ensure cache is enabled and cleared before each test.
    enableUserProfileCache();
    clearUserProfileCache();
  });

  afterAll(() => {
    // Clean up after all tests.
    enableUserProfileCache();
    clearUserProfileCache();
  });

  describe('getCachedUserProfile / setCachedUserProfile', () => {
    it('should return undefined for uncached UID', () => {
      const result = getCachedUserProfile('u_unknown');
      expect(result).toBeUndefined();
    });

    it('should cache and retrieve a user profile', () => {
      const userInfo: UserInfo = {
        username: 'test_user',
        email: 'test@example.com',
        fullName: 'Test User',
      };

      setCachedUserProfile('u_test_0', userInfo);
      const result = getCachedUserProfile('u_test_0');

      expect(result).toEqual(userInfo);
    });

    it('should overwrite existing cached profile', () => {
      const original: UserInfo = { username: 'original' };
      const updated: UserInfo = { username: 'updated', email: 'updated@example.com' };

      setCachedUserProfile('u_test_0', original);
      setCachedUserProfile('u_test_0', updated);

      const result = getCachedUserProfile('u_test_0');
      expect(result).toEqual(updated);
    });
  });

  describe('getCachedUserProfiles / setCachedUserProfiles', () => {
    it('should return empty map for empty input', () => {
      const result = getCachedUserProfiles([]);
      expect(result.size).toBe(0);
    });

    it('should return empty map when no UIDs are cached', () => {
      const result = getCachedUserProfiles(['u_unknown_1', 'u_unknown_2']);
      expect(result.size).toBe(0);
    });

    it('should return only cached profiles', () => {
      const cached: UserInfo = { username: 'cached_user' };
      setCachedUserProfile('u_cached', cached);

      const result = getCachedUserProfiles(['u_cached', 'u_uncached']);

      expect(result.size).toBe(1);
      expect(result.get('u_cached')).toEqual(cached);
      expect(result.get('u_uncached')).toBeUndefined();
    });

    it('should cache multiple profiles at once', () => {
      const profiles = new Map<string, UserInfo>([
        ['u_user_1', { username: 'user1' }],
        ['u_user_2', { username: 'user2', email: 'user2@example.com' }],
      ]);

      setCachedUserProfiles(profiles);

      const result = getCachedUserProfiles(['u_user_1', 'u_user_2']);
      expect(result.size).toBe(2);
      expect(result.get('u_user_1')).toEqual({ username: 'user1' });
      expect(result.get('u_user_2')).toEqual({ username: 'user2', email: 'user2@example.com' });
    });
  });

  describe('clearUserProfileCache', () => {
    it('should clear all cached profiles', () => {
      setCachedUserProfile('u_test_1', { username: 'user1' });
      setCachedUserProfile('u_test_2', { username: 'user2' });

      clearUserProfileCache();

      expect(getCachedUserProfile('u_test_1')).toBeUndefined();
      expect(getCachedUserProfile('u_test_2')).toBeUndefined();
    });
  });

  describe('disableUserProfileCache / enableUserProfileCache', () => {
    it('should not cache when disabled', () => {
      disableUserProfileCache();

      setCachedUserProfile('u_test', { username: 'user' });
      const result = getCachedUserProfile('u_test');

      expect(result).toBeUndefined();
    });

    it('should resume caching when re-enabled', () => {
      disableUserProfileCache();
      setCachedUserProfile('u_test_1', { username: 'user1' });

      enableUserProfileCache();
      setCachedUserProfile('u_test_2', { username: 'user2' });

      // u_test_1 was not cached because cache was disabled.
      expect(getCachedUserProfile('u_test_1')).toBeUndefined();
      // u_test_2 was cached after re-enabling.
      expect(getCachedUserProfile('u_test_2')).toEqual({ username: 'user2' });
    });

    it('should return empty from getCachedUserProfiles when disabled', () => {
      setCachedUserProfile('u_test', { username: 'user' });
      disableUserProfileCache();

      const result = getCachedUserProfiles(['u_test']);
      expect(result.size).toBe(0);
    });
  });
});
