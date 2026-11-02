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
import { ContentListProvider } from '../context';
import type { FindItemsParams, FindItemsResult } from '../datasource';
import type { ContentListUserProfilesServices } from '../services';
import { ProfileCache, useProfileCache } from '../services';
import { useFieldDefinitions } from './field_definitions';

const mockUsers = [
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

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const mockTagsService: ContentManagementTagsServices = {
  getTagList: () => [
    { id: 'tag-1', name: 'Production', description: '', color: '#FF0000', managed: false },
    { id: 'tag-2', name: 'Archived', description: '', color: '#808080', managed: false },
  ],
};

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

const createWrapper =
  (options?: {
    tags?: ContentManagementTagsServices;
    userProfiles?: ContentListUserProfilesServices;
    favorites?: FavoritesClientPublic;
    features?: {
      tags?: boolean;
      userProfiles?: boolean;
      starred?: boolean;
    };
  }) =>
  ({ children }: { children: React.ReactNode }) => {
    const { tags, userProfiles, favorites, features } = options ?? {};
    const profileCache = userProfiles ? new ProfileCache(userProfiles.bulkResolve) : undefined;

    return (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'item', entityPlural: 'items' }}
        dataSource={{ findItems: mockFindItems }}
        services={{
          ...(tags ? { tags } : {}),
          ...(userProfiles ? { userProfiles } : {}),
          ...(favorites ? { favorites } : {}),
        }}
        features={features}
        profileCache={profileCache}
      >
        {children}
      </ContentListProvider>
    );
  };

/**
 * Helper hook that exposes both field definitions and the profile cache,
 * so tests can seed the cache before asserting on field resolution.
 */
const useFieldDefinitionsWithCache = () => {
  const profileCache = useProfileCache();
  const fieldDefs = useFieldDefinitions();
  return { ...fieldDefs, profileCache };
};

describe('useFieldDefinitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds tag and createdBy field definitions plus the starred flag when supported', async () => {
    const { result } = renderHook(() => useFieldDefinitionsWithCache(), {
      wrapper: createWrapper({
        tags: mockTagsService,
        userProfiles: mockUserProfilesService,
        favorites: mockFavoritesService,
      }),
    });

    expect(result.current.fields.map((field) => field.fieldName)).toEqual(['tag', 'createdBy']);
    expect(result.current.flags).toEqual([{ flagName: 'starred', modelKey: 'starred' }]);

    // Seed the profile cache so user-field resolution works.
    await act(async () => {
      await result.current.profileCache?.ensureLoaded(mockUsers.map((u) => u.uid));
    });

    const tagField = result.current.fields.find((field) => field.fieldName === 'tag');
    const createdByField = result.current.fields.find((field) => field.fieldName === 'createdBy');

    expect(tagField?.resolveIdToDisplay('tag-1')).toBe('Production');
    expect(tagField?.resolveDisplayToId('Archived')).toBe('tag-2');
    expect(tagField?.resolveFuzzyDisplayToIds?.('prod')).toEqual(['tag-1']);

    expect(createdByField?.resolveIdToDisplay('u_jane')).toBe('jane@example.com');
    expect(createdByField?.resolveDisplayToId('john@example.com')).toBe('u_john');
    expect(createdByField?.resolveFuzzyDisplayToIds?.('jane')).toEqual(['u_jane']);
    expect(createdByField?.resolveFuzzyDisplayToIds?.('john example')).toEqual(['u_john']);
  });

  it('omits field and flag definitions when their features are disabled', () => {
    const { result } = renderHook(() => useFieldDefinitions(), {
      wrapper: createWrapper({
        tags: mockTagsService,
        userProfiles: mockUserProfilesService,
        favorites: mockFavoritesService,
        features: {
          tags: false,
          userProfiles: false,
          starred: false,
        },
      }),
    });

    expect(result.current.fields).toEqual([]);
    expect(result.current.flags).toEqual([]);
  });

  it('falls back to the raw value when a tag or user cannot be resolved', async () => {
    const { result } = renderHook(() => useFieldDefinitionsWithCache(), {
      wrapper: createWrapper({
        tags: mockTagsService,
        userProfiles: mockUserProfilesService,
      }),
    });

    // Seed the profile cache.
    await act(async () => {
      await result.current.profileCache?.ensureLoaded(mockUsers.map((u) => u.uid));
    });

    const tagField = result.current.fields.find((field) => field.fieldName === 'tag');
    const createdByField = result.current.fields.find((field) => field.fieldName === 'createdBy');

    expect(tagField?.resolveIdToDisplay('missing-tag')).toBe('missing-tag');
    expect(tagField?.resolveDisplayToId('Missing Tag')).toBeUndefined();
    expect(createdByField?.resolveIdToDisplay('missing-user')).toBe('missing-user');
    expect(createdByField?.resolveDisplayToId('missing@example.com')).toBeUndefined();
    expect(createdByField?.resolveFuzzyDisplayToIds?.('missing')).toEqual([]);
  });
});
