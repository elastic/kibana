/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListServices } from '@kbn/content-list-provider';
import type { Tag } from '@kbn/content-management-tags';
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import { mockUserProfileServices } from './user_profiles';

export interface MockServicesOptions {
  /** Enable user profile services. Default: true */
  userProfiles?: boolean;
  /** Enable tags services. Default: true */
  tags?: boolean;
  /** Custom tag list to use instead of MOCK_TAGS */
  tagList?: Tag[];
  /** Enable favorites services. Default: true */
  favorites?: boolean;
}

/**
 * Default favorite IDs - pre-populate with items matching the `favorite: true` pattern.
 * These IDs match the pattern from `createMockItems` in test_utils where
 * every 3rd item (items 3, 6, 9, etc.) has `favorite: true`.
 * For a 50-item list, this includes all 16 favorites to ensure the reactive
 * filtering in `state_provider.tsx` finds matches after `createMockFindItems`
 * has already filtered by `item.favorite`.
 */
const DEFAULT_FAVORITE_IDS = [
  'item-3',
  'item-6',
  'item-9',
  'item-12',
  'item-15',
  'item-18',
  'item-21',
  'item-24',
  'item-27',
  'item-30',
  'item-33',
  'item-36',
  'item-39',
  'item-42',
  'item-45',
  'item-48',
];

/** In-memory store for mock favorites */
let mockFavoriteIds: string[] = [...DEFAULT_FAVORITE_IDS];

/**
 * Reset mock favorites to default state.
 * Useful for Storybook stories that need a clean slate.
 */
export const resetMockFavorites = () => {
  mockFavoriteIds = [...DEFAULT_FAVORITE_IDS];
};

/**
 * Creates a mock `FavoritesClientPublic` for Storybook stories.
 * Uses in-memory storage for favorite IDs.
 * Pre-populated with `DEFAULT_FAVORITE_IDS` containing all items where `favorite: true`
 * for a 50-item list (items 3, 6, 9, ..., 48).
 */
export const mockFavoritesClient: FavoritesClientPublic = {
  // The generic type constraint makes favoriteMetadata: never when Metadata is void,
  // so we cast to satisfy the type while omitting favoriteMetadata from the response
  getFavorites: (async () => ({
    favoriteIds: mockFavoriteIds,
  })) as FavoritesClientPublic['getFavorites'],
  addFavorite: async ({ id }) => {
    if (!mockFavoriteIds.includes(id)) {
      mockFavoriteIds = [...mockFavoriteIds, id];
    }
    return { favoriteIds: mockFavoriteIds };
  },
  removeFavorite: async ({ id }) => {
    mockFavoriteIds = mockFavoriteIds.filter((fid) => fid !== id);
    return { favoriteIds: mockFavoriteIds };
  },
  isAvailable: async () => true,
  getFavoriteType: () => 'mock-content',
  reportAddFavoriteClick: () => {},
  reportRemoveFavoriteClick: () => {},
};

/**
 * Creates a mock ContentListServices object for Storybook stories.
 * By default, enables user profiles, tags, and favorites services.
 */
export function createMockServices(options: MockServicesOptions = {}): ContentListServices {
  const { userProfiles = false, tags = false, tagList = [], favorites = false } = options;

  return {
    userProfile: userProfiles ? mockUserProfileServices : undefined,
    tags: tags ? { getTagList: () => tagList } : undefined,
    favorites: favorites ? { favoritesClient: mockFavoritesClient } : undefined,
  };
}
