/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import type { ContentManagementTagsServices } from '@kbn/content-management-tags';
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import type { ContentListUserProfilesServices, UserProfileEntry } from '../services';
import { ContentListProvider } from '../context';
import type { FindItemsParams, FindItemsResult } from '../datasource';
import { ProfileCache, useProfileCache } from '../services';
import { useFieldDefinitions } from './field_definitions';

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({ items: [], total: 0 })
);

const mockTags = [
  { id: 'tag-1', name: 'Production', description: '', color: '#FF0000', managed: false },
  { id: 'tag-2', name: 'Archived', description: '', color: '#808080', managed: false },
];

const mockTagsService: ContentManagementTagsServices = {
  getTagList: () => mockTags,
};

const mockUsers: UserProfileEntry[] = [
  {
    uid: 'u_jane',
    user: { username: 'jane', email: 'jane@example.com', full_name: 'Jane Example' },
    email: 'jane@example.com',
    fullName: 'Jane Example',
  },
  {
    uid: 'u_john',
    user: { username: 'john', email: 'john@example.com', full_name: 'John Example' },
    email: 'john@example.com',
    fullName: 'John Example',
  },
];

const mockUserProfilesService: ContentListUserProfilesServices = {
  bulkResolve: async (uids) => mockUsers.filter((u) => uids.includes(u.uid)),
};

const mockFavoritesService: FavoritesClientPublic = {
  getFavorites: async () => ({ favoriteIds: [], favoriteMetadata: {} as Record<string, never> }),
  addFavorite: async ({ id }: { id: string }) => ({ favoriteIds: [id] }),
  removeFavorite: async () => ({ favoriteIds: [] }),
  isAvailable: async () => true,
  getFavoriteType: () => 'mock',
  reportAddFavoriteClick: () => {},
  reportRemoveFavoriteClick: () => {},
};

// ---------------------------------------------------------------------------
// Wrapper helpers
// ---------------------------------------------------------------------------

const createWrapper =
  (options?: {
    tags?: ContentManagementTagsServices;
    userProfiles?: ContentListUserProfilesServices;
    favorites?: FavoritesClientPublic;
    features?: {
      tags?: boolean;
      userProfiles?: boolean;
      starred?: boolean;
      fields?: Array<{
        fieldName: string;
        resolveIdToDisplay: (id: string) => string;
        resolveDisplayToId: (d: string) => string | undefined;
      }>;
      flags?: Array<{ flagName: string; modelKey: string }>;
    };
  }) =>
  ({ children }: { children: React.ReactNode }) => {
    const profileCache = options?.userProfiles
      ? new ProfileCache(options.userProfiles.bulkResolve)
      : undefined;

    return (
      <ContentListProvider
        id="test"
        labels={{ entity: 'item', entityPlural: 'items' }}
        dataSource={{ findItems: mockFindItems }}
        services={{
          tags: options?.tags,
          userProfiles: options?.userProfiles,
          favorites: options?.favorites,
        }}
        features={options?.features}
        profileCache={profileCache}
      >
        {children}
      </ContentListProvider>
    );
  };

/** Hook exposing both field definitions and the profile cache for seeding. */
const useFieldDefinitionsWithCache = () => {
  const profileCache = useProfileCache();
  const defs = useFieldDefinitions();
  return { ...defs, profileCache };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFieldDefinitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fieldNames', () => {
    it('includes `tag` when tags service is provided.', () => {
      const wrapper = createWrapper({ tags: mockTagsService });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      expect(result.current.fieldNames).toContain('tag');
    });

    it('includes `createdBy` when userProfiles service is provided.', () => {
      const wrapper = createWrapper({ userProfiles: mockUserProfilesService });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      expect(result.current.fieldNames).toContain('createdBy');
    });

    it('returns an empty array when no services are provided.', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      expect(result.current.fieldNames).toEqual([]);
    });

    it('includes consumer-provided custom field names.', () => {
      const customField = {
        fieldName: 'status',
        resolveIdToDisplay: (id: string) => id,
        resolveDisplayToId: (d: string) => d,
      };
      const wrapper = createWrapper({
        tags: mockTagsService,
        features: { fields: [customField] },
      });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      expect(result.current.fieldNames).toContain('tag');
      expect(result.current.fieldNames).toContain('status');
    });
  });

  describe('flags', () => {
    it('includes `starred` flag when favorites service is provided.', () => {
      const wrapper = createWrapper({ favorites: mockFavoritesService });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      expect(result.current.flags).toContainEqual({ flagName: 'starred', modelKey: 'starred' });
    });

    it('does not include `starred` flag when favorites service is absent.', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      expect(result.current.flags).not.toContainEqual(
        expect.objectContaining({ flagName: 'starred' })
      );
    });

    it('includes consumer-provided custom flags.', () => {
      const customFlag = { flagName: 'managed', modelKey: 'managed' };
      const wrapper = createWrapper({ features: { flags: [customFlag] } });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      expect(result.current.flags).toContainEqual(customFlag);
    });
  });

  describe('tag field resolution', () => {
    it('resolves tag ID to display name.', () => {
      const wrapper = createWrapper({ tags: mockTagsService });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      const tagDef = result.current.fields.find((f) => f.fieldName === 'tag');
      expect(tagDef?.resolveIdToDisplay('tag-1')).toBe('Production');
    });

    it('returns the raw ID when no matching tag is found.', () => {
      const wrapper = createWrapper({ tags: mockTagsService });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      const tagDef = result.current.fields.find((f) => f.fieldName === 'tag');
      expect(tagDef?.resolveIdToDisplay('unknown-id')).toBe('unknown-id');
    });

    it('resolves tag display name to ID.', () => {
      const wrapper = createWrapper({ tags: mockTagsService });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      const tagDef = result.current.fields.find((f) => f.fieldName === 'tag');
      expect(tagDef?.resolveDisplayToId('Production')).toBe('tag-1');
    });

    it('returns `undefined` when tag name does not match.', () => {
      const wrapper = createWrapper({ tags: mockTagsService });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      const tagDef = result.current.fields.find((f) => f.fieldName === 'tag');
      expect(tagDef?.resolveDisplayToId('Nonexistent')).toBeUndefined();
    });

    it('fuzzy-resolves partial tag names.', () => {
      const wrapper = createWrapper({ tags: mockTagsService });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      const tagDef = result.current.fields.find((f) => f.fieldName === 'tag');
      expect(tagDef?.resolveFuzzyDisplayToIds?.('prod')).toEqual(['tag-1']);
    });
  });

  describe('user field resolution', () => {
    it('resolves UID to email (preferred) via profile store.', async () => {
      const wrapper = createWrapper({ userProfiles: mockUserProfilesService });
      const { result } = renderHook(() => useFieldDefinitionsWithCache(), { wrapper });

      await act(async () => {
        await result.current.profileCache?.ensureLoaded(['u_jane']);
      });

      const createdByDef = result.current.fields.find((f) => f.fieldName === 'createdBy');
      expect(createdByDef?.resolveIdToDisplay('u_jane')).toBe('jane@example.com');
    });

    it('falls back to UID when profile is not cached.', () => {
      const wrapper = createWrapper({ userProfiles: mockUserProfilesService });
      const { result } = renderHook(() => useFieldDefinitionsWithCache(), { wrapper });

      const createdByDef = result.current.fields.find((f) => f.fieldName === 'createdBy');
      expect(createdByDef?.resolveIdToDisplay('u_unknown')).toBe('u_unknown');
    });

    it('resolves display email to UID (exact match).', async () => {
      const wrapper = createWrapper({ userProfiles: mockUserProfilesService });
      const { result } = renderHook(() => useFieldDefinitionsWithCache(), { wrapper });

      await act(async () => {
        await result.current.profileCache?.ensureLoaded(['u_jane', 'u_john']);
      });

      const createdByDef = result.current.fields.find((f) => f.fieldName === 'createdBy');
      expect(createdByDef?.resolveDisplayToId('jane@example.com')).toBe('u_jane');
    });

    it('resolves display full name to UID (exact match, case-insensitive).', async () => {
      const wrapper = createWrapper({ userProfiles: mockUserProfilesService });
      const { result } = renderHook(() => useFieldDefinitionsWithCache(), { wrapper });

      await act(async () => {
        await result.current.profileCache?.ensureLoaded(['u_jane']);
      });

      const createdByDef = result.current.fields.find((f) => f.fieldName === 'createdBy');
      expect(createdByDef?.resolveDisplayToId('JANE EXAMPLE')).toBe('u_jane');
    });

    it('fuzzy-resolves partial email to matching UIDs.', async () => {
      const wrapper = createWrapper({ userProfiles: mockUserProfilesService });
      const { result } = renderHook(() => useFieldDefinitionsWithCache(), { wrapper });

      await act(async () => {
        await result.current.profileCache?.ensureLoaded(['u_jane', 'u_john']);
      });

      const createdByDef = result.current.fields.find((f) => f.fieldName === 'createdBy');
      const matches = createdByDef?.resolveFuzzyDisplayToIds?.('example');
      expect(matches).toEqual(expect.arrayContaining(['u_jane', 'u_john']));
    });

    it('returns empty array for fuzzy search with no matches.', async () => {
      const wrapper = createWrapper({ userProfiles: mockUserProfilesService });
      const { result } = renderHook(() => useFieldDefinitionsWithCache(), { wrapper });

      await act(async () => {
        await result.current.profileCache?.ensureLoaded(['u_jane', 'u_john']);
      });

      const createdByDef = result.current.fields.find((f) => f.fieldName === 'createdBy');
      expect(createdByDef?.resolveFuzzyDisplayToIds?.('zzz_nomatch')).toEqual([]);
    });

    it('resolves sentinel key `__managed__` to display label.', () => {
      const wrapper = createWrapper({ userProfiles: mockUserProfilesService });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      const createdByDef = result.current.fields.find((f) => f.fieldName === 'createdBy');
      expect(createdByDef?.resolveIdToDisplay('__managed__')).toBe('Managed');
    });

    it('resolves sentinel key `__no_creator__` to display label.', () => {
      const wrapper = createWrapper({ userProfiles: mockUserProfilesService });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      const createdByDef = result.current.fields.find((f) => f.fieldName === 'createdBy');
      expect(createdByDef?.resolveIdToDisplay('__no_creator__')).toBe('No creator');
    });

    it('resolves sentinel display label "Managed" back to `__managed__`.', () => {
      const wrapper = createWrapper({ userProfiles: mockUserProfilesService });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      const createdByDef = result.current.fields.find((f) => f.fieldName === 'createdBy');
      expect(createdByDef?.resolveDisplayToId('Managed')).toBe('__managed__');
    });

    it('resolves sentinel display label "No creator" back to `__no_creator__`.', () => {
      const wrapper = createWrapper({ userProfiles: mockUserProfilesService });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      const createdByDef = result.current.fields.find((f) => f.fieldName === 'createdBy');
      expect(createdByDef?.resolveDisplayToId('No creator')).toBe('__no_creator__');
    });

    it('resolves raw sentinel keys via `resolveDisplayToId`.', () => {
      const wrapper = createWrapper({ userProfiles: mockUserProfilesService });
      const { result } = renderHook(() => useFieldDefinitions(), { wrapper });
      const createdByDef = result.current.fields.find((f) => f.fieldName === 'createdBy');
      expect(createdByDef?.resolveDisplayToId('__managed__')).toBe('__managed__');
      expect(createdByDef?.resolveDisplayToId('__no_creator__')).toBe('__no_creator__');
    });
  });
});
