/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { of } from 'rxjs';
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import { createFavoritesService } from './favorites_service';

describe('createFavoritesService', () => {
  const http = {
    get: jest.fn(),
    post: jest.fn(),
  } as unknown as jest.Mocked<HttpStart>;
  const userProfile = {
    getEnabled$: jest.fn(),
  } as unknown as jest.Mocked<UserProfileServiceStart>;
  const usageCollection = {
    reportUiCounter: jest.fn(),
  } as unknown as jest.Mocked<UsageCollectionStart>;

  beforeEach(() => {
    jest.clearAllMocks();
    userProfile.getEnabled$.mockReturnValue(of(true));
  });

  it('returns a real `FavoritesClient` configured for the supplied favorite type', async () => {
    http.get.mockResolvedValue({ favoriteIds: ['dash-1'], favoriteMetadata: {} });

    const service = createFavoritesService({
      appId: 'dashboards',
      savedObjectType: 'dashboard',
      http,
      userProfile,
      usageCollection,
    });

    await expect(service.getFavorites()).resolves.toEqual({
      favoriteIds: ['dash-1'],
      favoriteMetadata: {},
    });

    expect(service).toBeInstanceOf(FavoritesClient);
    expect(service.getFavoriteType()).toBe('dashboard');
    expect(http.get).toHaveBeenCalledWith('/internal/content_management/favorites/dashboard');
  });

  it('passes metadata through `addFavorite` and reports usage events', async () => {
    http.post.mockResolvedValue({ favoriteIds: ['map-1'] });

    const service = createFavoritesService<{ title: string }>({
      appId: 'maps',
      savedObjectType: 'map',
      http,
      userProfile,
      usageCollection,
    });

    await expect(
      service.addFavorite({ id: 'map-1', metadata: { title: 'Road trip' } })
    ).resolves.toEqual({
      favoriteIds: ['map-1'],
    });
    service.reportAddFavoriteClick();
    service.reportRemoveFavoriteClick();

    expect(http.post).toHaveBeenCalledWith(
      '/internal/content_management/favorites/map/map-1/favorite',
      { body: JSON.stringify({ metadata: { title: 'Road trip' } }) }
    );
    expect(usageCollection.reportUiCounter).toHaveBeenNthCalledWith(
      1,
      'maps',
      'click',
      'add_favorite'
    );
    expect(usageCollection.reportUiCounter).toHaveBeenNthCalledWith(
      2,
      'maps',
      'click',
      'remove_favorite'
    );
  });

  it('does not report usage clicks when `usageCollection` is omitted', async () => {
    http.get.mockResolvedValue({ favoriteIds: [], favoriteMetadata: {} });

    const service = createFavoritesService({
      appId: 'dashboards',
      savedObjectType: 'dashboard',
      http,
      userProfile,
    });

    expect(() => {
      service.reportAddFavoriteClick();
      service.reportRemoveFavoriteClick();
    }).not.toThrow();

    await expect(service.getFavorites()).resolves.toEqual({
      favoriteIds: [],
      favoriteMetadata: {},
    });

    expect(usageCollection.reportUiCounter).not.toHaveBeenCalled();
  });
});
