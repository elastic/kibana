/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FavoritesService } from './favorites_service';
import { of } from 'rxjs';

// Mock dependencies
const mockHttp = {
  get: jest.fn(),
  post: jest.fn(),
} as any;

const mockUserProfile = {
  getEnabled$: jest.fn(() => of(true)), // Return an observable that emits true
} as any;

const mockUsageCollection = {
  reportUiCounter: jest.fn(),
} as any;

describe('FavoritesService', () => {
  let favoritesService: FavoritesService;

  beforeEach(() => {
    favoritesService = new FavoritesService({
      http: mockHttp,
      userProfile: mockUserProfile,
      usageCollection: mockUsageCollection,
    });
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('FavoritesClient Compatibility Interface', () => {
    beforeEach(() => {
      // Configure the service for testing
      favoritesService.configureForApp('test-app', 'dashboard');
    });

    describe('getFavorites', () => {
      it('should get favorites for configured content type', async () => {
        const mockFavorites = { favoriteIds: ['id1', 'id2', 'id3'] };
        mockHttp.get.mockResolvedValue(mockFavorites);
        
        const result = await favoritesService.getFavorites();
        
        expect(mockHttp.get).toHaveBeenCalledWith(
          '/internal/content_management/favorites/dashboard'
        );
        expect(result).toEqual(mockFavorites);
      });

      it('should throw error if not configured', async () => {
        const unconfiguredService = new FavoritesService({
          http: mockHttp,
          userProfile: mockUserProfile,
          usageCollection: mockUsageCollection,
        });

        await expect(unconfiguredService.getFavorites()).rejects.toThrow(
          'Service must be configured with configureForApp() before use'
        );
      });
    });

    describe('addFavorite', () => {
      it('should add favorite for configured content type', async () => {
        mockHttp.post.mockResolvedValue({ favoriteIds: ['test-id'] });
        
        await favoritesService.addFavorite({ id: 'test-id' });
        
        expect(mockHttp.post).toHaveBeenCalledWith(
          '/internal/content_management/favorites/dashboard/test-id/favorite',
          { body: undefined }
        );
      });

      it('should add favorite with metadata', async () => {
        mockHttp.post.mockResolvedValue({ favoriteIds: ['test-id'] });
        
        await favoritesService.addFavorite({ id: 'test-id', metadata: { title: 'Test' } });
        
        expect(mockHttp.post).toHaveBeenCalledWith(
          '/internal/content_management/favorites/dashboard/test-id/favorite',
          { body: JSON.stringify({ metadata: { title: 'Test' } }) }
        );
      });
    });

    describe('removeFavorite', () => {
      it('should remove favorite for configured content type', async () => {
        mockHttp.post.mockResolvedValue({ favoriteIds: [] });
        
        await favoritesService.removeFavorite({ id: 'test-id' });
        
        expect(mockHttp.post).toHaveBeenCalledWith(
          '/internal/content_management/favorites/dashboard/test-id/unfavorite'
        );
      });
    });

    describe('isAvailable', () => {
      it('should return true when configured and available', async () => {
        const result = await favoritesService.isAvailable();
        expect(result).toBe(true);
      });

      it('should return false when not configured', async () => {
        const unconfiguredService = new FavoritesService({
          http: mockHttp,
          userProfile: mockUserProfile,
          usageCollection: mockUsageCollection,
        });

        const result = await unconfiguredService.isAvailable();
        expect(result).toBe(false);
      });
    });

    describe('getFavoriteType', () => {
      it('should return configured content type', () => {
        const result = favoritesService.getFavoriteType();
        expect(result).toBe('dashboard');
      });
    });

    describe('reportAddFavoriteClick', () => {
      it('should report add favorite click', () => {
        favoritesService.reportAddFavoriteClick();
        expect(mockUsageCollection.reportUiCounter).toHaveBeenCalledWith('test-app', 'click', 'add_favorite');
      });
    });

    describe('reportRemoveFavoriteClick', () => {
      it('should report remove favorite click', () => {
        favoritesService.reportRemoveFavoriteClick();
        expect(mockUsageCollection.reportUiCounter).toHaveBeenCalledWith('test-app', 'click', 'remove_favorite');
      });
    });
  });

  describe('Enhanced Simple API', () => {
    describe('addFavoriteSimple', () => {
      it('should add a favorite successfully', async () => {
        mockHttp.post.mockResolvedValue({ favoriteIds: ['test-id'] });
        
        await favoritesService.addFavoriteSimple('dashboard', 'test-id');
        
        expect(mockHttp.post).toHaveBeenCalledWith(
          '/internal/content_management/favorites/dashboard/test-id/favorite',
          { body: undefined }
        );
      });
    });

    describe('removeFavoriteSimple', () => {
      it('should remove a favorite successfully', async () => {
        mockHttp.post.mockResolvedValue({ favoriteIds: [] });
        
        await favoritesService.removeFavoriteSimple('dashboard', 'test-id');
        
        expect(mockHttp.post).toHaveBeenCalledWith(
          '/internal/content_management/favorites/dashboard/test-id/unfavorite'
        );
      });
    });

    describe('listFavorites', () => {
      it('should return list of favorites', async () => {
        const mockFavorites = { favoriteIds: ['id1', 'id2', 'id3'] };
        mockHttp.get.mockResolvedValue(mockFavorites);
        
        const result = await favoritesService.listFavorites('dashboard');
        
        expect(mockHttp.get).toHaveBeenCalledWith(
          '/internal/content_management/favorites/dashboard'
        );
        expect(result).toEqual(['id1', 'id2', 'id3']);
      });
    });

    describe('isFavorite', () => {
      it('should return true when item is favorited', async () => {
        const mockFavorites = { favoriteIds: ['id1', 'id2', 'id3'] };
        mockHttp.get.mockResolvedValue(mockFavorites);
        
        const result = await favoritesService.isFavorite('dashboard', 'id2');
        
        expect(result).toBe(true);
      });

      it('should return false when item is not favorited', async () => {
        const mockFavorites = { favoriteIds: ['id1', 'id2', 'id3'] };
        mockHttp.get.mockResolvedValue(mockFavorites);
        
        const result = await favoritesService.isFavorite('dashboard', 'id4');
        
        expect(result).toBe(false);
      });
    });

    describe('toggleFavorite', () => {
      it('should add favorite when not favorited', async () => {
        const mockFavorites = { favoriteIds: ['id1', 'id2'] };
        mockHttp.get.mockResolvedValue(mockFavorites);
        mockHttp.post.mockResolvedValue({ favoriteIds: ['id1', 'id2', 'id3'] });
        
        const result = await favoritesService.toggleFavorite('dashboard', 'id3');
        
        expect(result).toBe(true);
        expect(mockHttp.post).toHaveBeenCalledWith(
          '/internal/content_management/favorites/dashboard/id3/favorite',
          { body: undefined }
        );
      });

      it('should remove favorite when already favorited', async () => {
        const mockFavorites = { favoriteIds: ['id1', 'id2', 'id3'] };
        mockHttp.get.mockResolvedValue(mockFavorites);
        mockHttp.post.mockResolvedValue({ favoriteIds: ['id1', 'id2'] });
        
        const result = await favoritesService.toggleFavorite('dashboard', 'id3');
        
        expect(result).toBe(false);
        expect(mockHttp.post).toHaveBeenCalledWith(
          '/internal/content_management/favorites/dashboard/id3/unfavorite'
        );
      });
    });
  });

  describe('Cross-App Functionality', () => {
    describe('getAllFavorites', () => {
      it('should return favorites from multiple types', async () => {
        // Mock responses for different types
        mockHttp.get
          .mockResolvedValueOnce({ favoriteIds: ['dashboard1', 'dashboard2'] }) // dashboard
          .mockResolvedValueOnce({ favoriteIds: ['search1'] }); // saved_search

        const result = await favoritesService.getAllFavorites();
        
        expect(result).toEqual([
          { id: 'dashboard1', type: 'dashboard' },
          { id: 'dashboard2', type: 'dashboard' },
          { id: 'search1', type: 'saved_search' },
        ]);
      });
    });

    describe('getFavoritesForTypes', () => {
      it('should return favorites for specified types', async () => {
        mockHttp.get
          .mockResolvedValueOnce({ favoriteIds: ['dashboard1'] }) // dashboard
          .mockResolvedValueOnce({ favoriteIds: ['search1'] }); // saved_search

        const result = await favoritesService.getFavoritesForTypes(['dashboard', 'saved_search']);
        
        expect(result).toEqual([
          { id: 'dashboard1', type: 'dashboard' },
          { id: 'search1', type: 'saved_search' },
        ]);
      });
    });
  });
});
