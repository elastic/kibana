/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, CoreStart, SavedObjectsClientContract } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  isUserProfileUid,
  getDistinctCreators,
  resolveCreatedByFilter,
  fetchUserProfiles,
} from './user_resolution';
import {
  disableUserProfileCache,
  enableUserProfileCache,
  clearUserProfileCache,
} from './user_profile_cache';

describe('user_resolution', () => {
  describe('isUserProfileUid', () => {
    it('should return true for valid user profile UIDs', () => {
      expect(isUserProfileUid('u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0')).toBe(true);
      expect(isUserProfileUid('u_user_0')).toBe(true);
      expect(isUserProfileUid('u_abc_123')).toBe(true);
    });

    it('should return false for invalid user profile UIDs', () => {
      expect(isUserProfileUid('john.doe')).toBe(false);
      expect(isUserProfileUid('john@example.com')).toBe(false);
      expect(isUserProfileUid('u_singlepart')).toBe(false);
      expect(isUserProfileUid('user_abc_123')).toBe(false);
      expect(isUserProfileUid('')).toBe(false);
    });
  });

  describe('getDistinctCreators', () => {
    const createMockLogger = (): jest.Mocked<Logger> => loggingSystemMock.createLogger();

    const createMockSavedObjectsClient = () => ({
      search: jest.fn(),
    });

    it('should return distinct creator UIDs from aggregation', async () => {
      const mockClient = createMockSavedObjectsClient();
      mockClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
        aggregations: {
          unique_creators: {
            buckets: [
              { key: 'u_user1', doc_count: 5 },
              { key: 'u_user2', doc_count: 3 },
            ],
          },
        },
      });

      const result = await getDistinctCreators(
        mockClient as unknown as Pick<SavedObjectsClientContract, 'search'>,
        'dashboard',
        ['default'],
        createMockLogger()
      );

      expect(result).toEqual(['u_user1', 'u_user2']);
      expect(mockClient.search).toHaveBeenCalledWith({
        type: 'dashboard',
        namespaces: ['default'],
        query: { match_all: {} },
        size: 0,
        aggs: {
          unique_creators: {
            terms: {
              field: 'created_by',
              size: 1000,
            },
          },
        },
      });
    });

    it('should return empty array when no aggregations', async () => {
      const mockClient = createMockSavedObjectsClient();
      mockClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
      });

      const result = await getDistinctCreators(
        mockClient as unknown as Pick<SavedObjectsClientContract, 'search'>,
        'dashboard',
        ['default'],
        createMockLogger()
      );

      expect(result).toEqual([]);
    });

    it('should return empty array and log warning on error', async () => {
      const mockClient = createMockSavedObjectsClient();
      const mockLogger = createMockLogger();
      mockClient.search.mockRejectedValue(new Error('Search failed'));

      const result = await getDistinctCreators(
        mockClient as unknown as Pick<SavedObjectsClientContract, 'search'>,
        'dashboard',
        ['default'],
        mockLogger
      );

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to get distinct creators: Search failed'
      );
    });
  });

  describe('resolveCreatedByFilter', () => {
    const createMockLogger = (): jest.Mocked<Logger> => loggingSystemMock.createLogger();

    const createMockCoreStart = (
      profiles: Array<{
        uid: string;
        user: { username: string; email?: string };
      }> = []
    ): CoreStart =>
      ({
        userProfile: {
          bulkGet: jest.fn().mockResolvedValue(profiles),
        },
      } as unknown as CoreStart);

    it('should pass through UIDs without resolution', async () => {
      const mockLogger = createMockLogger();
      const mockCoreStart = createMockCoreStart();

      const result = await resolveCreatedByFilter(
        ['u_user1_0', 'u_user2_0'],
        [],
        mockCoreStart,
        mockLogger
      );

      expect(result.uids).toEqual(['u_user1_0', 'u_user2_0']);
      expect(result.inputToUidMap).toEqual({
        u_user1_0: 'u_user1_0',
        u_user2_0: 'u_user2_0',
      });
      expect(mockCoreStart.userProfile.bulkGet).not.toHaveBeenCalled();
    });

    it('should resolve usernames to UIDs', async () => {
      const mockLogger = createMockLogger();
      const mockCoreStart = createMockCoreStart([
        { uid: 'u_john_0', user: { username: 'john.doe', email: 'john@example.com' } },
      ]);

      const result = await resolveCreatedByFilter(
        ['john.doe'],
        ['u_john_0'],
        mockCoreStart,
        mockLogger
      );

      expect(result.uids).toContain('u_john_0');
      expect(result.inputToUidMap['john.doe']).toBe('u_john_0');
    });

    it('should resolve emails to UIDs', async () => {
      const mockLogger = createMockLogger();
      const mockCoreStart = createMockCoreStart([
        { uid: 'u_john_0', user: { username: 'john.doe', email: 'john@example.com' } },
      ]);

      const result = await resolveCreatedByFilter(
        ['john@example.com'],
        ['u_john_0'],
        mockCoreStart,
        mockLogger
      );

      expect(result.uids).toContain('u_john_0');
      expect(result.inputToUidMap['john@example.com']).toBe('u_john_0');
    });

    it('should handle case-insensitive matching for usernames', async () => {
      const mockLogger = createMockLogger();
      const mockCoreStart = createMockCoreStart([
        { uid: 'u_john_0', user: { username: 'john.doe' } },
      ]);

      const result = await resolveCreatedByFilter(
        ['JOHN.DOE'],
        ['u_john_0'],
        mockCoreStart,
        mockLogger
      );

      expect(result.uids).toContain('u_john_0');
      expect(result.inputToUidMap['JOHN.DOE']).toBe('u_john_0');
    });

    it('should return empty result for empty values', async () => {
      const result = await resolveCreatedByFilter(
        [],
        [],
        createMockCoreStart(),
        createMockLogger()
      );

      expect(result.uids).toEqual([]);
      expect(result.inputToUidMap).toEqual({});
    });

    it('should return early when no distinct creators exist', async () => {
      const mockLogger = createMockLogger();
      const mockCoreStart = createMockCoreStart();

      const result = await resolveCreatedByFilter(['john.doe'], [], mockCoreStart, mockLogger);

      // UIDs are empty but no error; just can't resolve.
      expect(result.uids).toEqual([]);
      expect(mockCoreStart.userProfile.bulkGet).not.toHaveBeenCalled();
    });

    it('should handle mixed UIDs and usernames', async () => {
      const mockLogger = createMockLogger();
      const mockCoreStart = createMockCoreStart([
        { uid: 'u_john_0', user: { username: 'john.doe' } },
      ]);

      const result = await resolveCreatedByFilter(
        ['u_existing_0', 'john.doe'],
        ['u_john_0', 'u_other_0'],
        mockCoreStart,
        mockLogger
      );

      expect(result.uids).toContain('u_existing_0');
      expect(result.uids).toContain('u_john_0');
      expect(result.inputToUidMap.u_existing_0).toBe('u_existing_0');
      expect(result.inputToUidMap['john.doe']).toBe('u_john_0');
    });

    it('should handle profile fetch errors gracefully', async () => {
      const mockLogger = createMockLogger();
      const mockCoreStart = {
        userProfile: {
          bulkGet: jest.fn().mockRejectedValue(new Error('Profile fetch failed')),
        },
      } as unknown as CoreStart;

      const result = await resolveCreatedByFilter(
        ['john.doe'],
        ['u_john_0'],
        mockCoreStart,
        mockLogger
      );

      expect(result.uids).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to resolve createdBy filter values: Profile fetch failed'
      );
    });

    it('should pass through "no-user" sentinel value without resolution', async () => {
      const mockLogger = createMockLogger();
      const mockCoreStart = createMockCoreStart();

      const result = await resolveCreatedByFilter(['no-user'], [], mockCoreStart, mockLogger);

      expect(result.uids).toEqual(['no-user']);
      expect(result.inputToUidMap).toEqual({ 'no-user': 'no-user' });
      expect(mockCoreStart.userProfile.bulkGet).not.toHaveBeenCalled();
    });

    it('should handle "no-user" combined with regular UIDs and usernames', async () => {
      const mockLogger = createMockLogger();
      const mockCoreStart = createMockCoreStart([
        { uid: 'u_john_0', user: { username: 'john.doe' } },
      ]);

      const result = await resolveCreatedByFilter(
        ['u_existing_0', 'john.doe', 'no-user'],
        ['u_john_0', 'u_other_0'],
        mockCoreStart,
        mockLogger
      );

      expect(result.uids).toContain('u_existing_0');
      expect(result.uids).toContain('u_john_0');
      expect(result.uids).toContain('no-user');
      expect(result.inputToUidMap.u_existing_0).toBe('u_existing_0');
      expect(result.inputToUidMap['john.doe']).toBe('u_john_0');
      expect(result.inputToUidMap['no-user']).toBe('no-user');
    });
  });

  describe('fetchUserProfiles', () => {
    const createMockLogger = (): jest.Mocked<Logger> => loggingSystemMock.createLogger();

    const createMockCoreStart = (
      profiles: Array<{
        uid: string;
        user: { username: string; email?: string; full_name?: string };
        data: { avatar?: { initials?: string } };
      }> = []
    ): CoreStart =>
      ({
        userProfile: {
          bulkGet: jest.fn().mockResolvedValue(profiles),
        },
      } as unknown as CoreStart);

    beforeEach(() => {
      // Disable cache to ensure tests are deterministic.
      disableUserProfileCache();
      clearUserProfileCache();
    });

    afterAll(() => {
      // Re-enable cache after tests.
      enableUserProfileCache();
    });

    it('should fetch and map user profiles', async () => {
      const mockLogger = createMockLogger();
      const mockCoreStart = createMockCoreStart([
        {
          uid: 'u_user1_0',
          user: {
            username: 'user1',
            email: 'user1@example.com',
            full_name: 'User One',
          },
          data: { avatar: { initials: 'U1' } },
        },
      ]);

      const result = await fetchUserProfiles(['u_user1_0'], mockCoreStart, mockLogger);

      expect(result.size).toBe(1);
      expect(result.get('u_user1_0')).toEqual({
        username: 'user1',
        email: 'user1@example.com',
        fullName: 'User One',
        avatar: { initials: 'U1' },
      });
    });

    it('should return empty map for empty UIDs', async () => {
      const mockCoreStart = createMockCoreStart();

      const result = await fetchUserProfiles([], mockCoreStart, createMockLogger());

      expect(result.size).toBe(0);
      expect(mockCoreStart.userProfile.bulkGet).not.toHaveBeenCalled();
    });

    it('should handle profile fetch errors gracefully', async () => {
      const mockLogger = createMockLogger();
      const mockCoreStart = {
        userProfile: {
          bulkGet: jest.fn().mockRejectedValue(new Error('Bulk get failed')),
        },
      } as unknown as CoreStart;

      const result = await fetchUserProfiles(['u_user1_0'], mockCoreStart, mockLogger);

      expect(result.size).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to fetch user profiles: Bulk get failed'
      );
    });

    it('should call bulkGet with correct parameters', async () => {
      const mockCoreStart = createMockCoreStart([]);

      await fetchUserProfiles(['u_user1_0', 'u_user2_0'], mockCoreStart, createMockLogger());

      expect(mockCoreStart.userProfile.bulkGet).toHaveBeenCalledWith({
        uids: new Set(['u_user1_0', 'u_user2_0']),
        dataPath: 'avatar',
      });
    });

    describe('with caching enabled', () => {
      beforeEach(() => {
        enableUserProfileCache();
        clearUserProfileCache();
      });

      afterEach(() => {
        disableUserProfileCache();
        clearUserProfileCache();
      });

      it('should return cached profiles without calling API', async () => {
        const mockLogger = createMockLogger();
        const mockCoreStart = createMockCoreStart([
          {
            uid: 'u_user1_0',
            user: { username: 'user1', email: 'user1@example.com' },
            data: {},
          },
        ]);

        // First call should fetch from API.
        const result1 = await fetchUserProfiles(['u_user1_0'], mockCoreStart, mockLogger);
        expect(result1.size).toBe(1);
        expect(mockCoreStart.userProfile.bulkGet).toHaveBeenCalledTimes(1);

        // Second call should use cache.
        const result2 = await fetchUserProfiles(['u_user1_0'], mockCoreStart, mockLogger);
        expect(result2.size).toBe(1);
        expect(result2.get('u_user1_0')).toEqual(result1.get('u_user1_0'));
        // bulkGet should NOT have been called again.
        expect(mockCoreStart.userProfile.bulkGet).toHaveBeenCalledTimes(1);
      });

      it('should only fetch uncached profiles', async () => {
        const mockLogger = createMockLogger();
        const mockCoreStart = createMockCoreStart([
          {
            uid: 'u_user1_0',
            user: { username: 'user1' },
            data: {},
          },
        ]);

        // First call caches u_user1_0.
        await fetchUserProfiles(['u_user1_0'], mockCoreStart, mockLogger);
        expect(mockCoreStart.userProfile.bulkGet).toHaveBeenCalledWith({
          uids: new Set(['u_user1_0']),
          dataPath: 'avatar',
        });

        // Update mock to return a different profile.
        (mockCoreStart.userProfile.bulkGet as jest.Mock).mockResolvedValue([
          {
            uid: 'u_user2_0',
            user: { username: 'user2' },
            data: {},
          },
        ]);

        // Second call with both UIDs should only fetch the uncached one.
        const result = await fetchUserProfiles(
          ['u_user1_0', 'u_user2_0'],
          mockCoreStart,
          mockLogger
        );
        expect(result.size).toBe(2);
        expect(mockCoreStart.userProfile.bulkGet).toHaveBeenLastCalledWith({
          uids: new Set(['u_user2_0']),
          dataPath: 'avatar',
        });
      });
    });
  });
});
