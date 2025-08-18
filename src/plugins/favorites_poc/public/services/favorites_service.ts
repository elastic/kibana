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
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import type {
  AddFavoriteResponse,
  GetFavoritesResponse,
  RemoveFavoriteResponse,
} from '@kbn/content-management-favorites-server';

export interface FavoritesServiceConfig {
  http: HttpStart;
  userProfile: UserProfileServiceStart;
  usageCollection?: UsageCollectionStart;
}

export interface FavoriteItem {
  id: string;
  type: string;
}

export class FavoritesService {
  private clients = new Map<string, FavoritesClient>();
  private currentAppName: string = 'favorites-poc';
  private currentContentType: string = '';
  
  // Simple in-memory cache for POC when API fails
  private localFavorites: Map<string, Set<string>> = new Map();

  constructor(private config: FavoritesServiceConfig) {}

  /**
   * Configure the service for a specific app and content type
   * This makes it compatible with existing FavoritesClient usage
   */
  configureForApp(appName: string, contentType: string): FavoritesService {
    this.currentAppName = appName;
    this.currentContentType = contentType;
    return this;
  }

  private getClient(type: string): FavoritesClient {
    if (!this.clients.has(type)) {
      this.clients.set(
        type,
        new FavoritesClient(this.currentAppName || 'favorites-poc', type, {
          http: this.config.http,
          userProfile: this.config.userProfile,
          usageCollection: this.config.usageCollection,
        })
      );
    }
    return this.clients.get(type)!;
  }

  // ============================================================================
  // FavoritesClient Compatible Interface (Drop-in replacement)
  // ============================================================================

  /**
   * Get favorites for the current content type (FavoritesClient compatible)
   */
  async getFavorites(): Promise<GetFavoritesResponse> {
    if (!this.currentContentType) {
      throw new Error('Service must be configured with configureForApp() before use');
    }
    const client = this.getClient(this.currentContentType);
    return client.getFavorites();
  }

  /**
   * Add a favorite for the current content type (FavoritesClient compatible)
   */
  async addFavorite(params: { id: string; metadata?: object }): Promise<AddFavoriteResponse> {
    if (!this.currentContentType) {
      throw new Error('Service must be configured with configureForApp() before use');
    }
    const client = this.getClient(this.currentContentType);
    return client.addFavorite(params);
  }

  /**
   * Remove a favorite for the current content type (FavoritesClient compatible)
   */
  async removeFavorite(params: { id: string }): Promise<RemoveFavoriteResponse> {
    if (!this.currentContentType) {
      throw new Error('Service must be configured with configureForApp() before use');
    }
    const client = this.getClient(this.currentContentType);
    return client.removeFavorite(params);
  }

  /**
   * Check if favorites are available (FavoritesClient compatible)
   */
  async isAvailable(): Promise<boolean> {
    if (!this.currentContentType) {
      return false;
    }
    const client = this.getClient(this.currentContentType);
    return client.isAvailable();
  }

  /**
   * Get the current favorite type (FavoritesClient compatible)
   */
  getFavoriteType(): string {
    return this.currentContentType;
  }

  /**
   * Report add favorite click (FavoritesClient compatible)
   */
  reportAddFavoriteClick(): void {
    if (!this.currentContentType) {
      return;
    }
    const client = this.getClient(this.currentContentType);
    client.reportAddFavoriteClick();
  }

  /**
   * Report remove favorite click (FavoritesClient compatible)
   */
  reportRemoveFavoriteClick(): void {
    if (!this.currentContentType) {
      return;
    }
    const client = this.getClient(this.currentContentType);
    client.reportRemoveFavoriteClick();
  }

  // ============================================================================
  // Enhanced API for Cross-App Functionality
  // ============================================================================

  /**
   * Add an item to favorites (Simple API)
   */
  async addFavoriteSimple(type: string, id: string): Promise<void> {
    const client = this.getClient(type);
    await client.addFavorite({ id });
  }

  /**
   * Remove an item from favorites (Simple API)
   */
  async removeFavoriteSimple(type: string, id: string): Promise<void> {
    const client = this.getClient(type);
    await client.removeFavorite({ id });
  }

  /**
   * Get all favorites for a specific type (Simple API)
   */
  async listFavorites(type: string): Promise<string[]> {
    const client = this.getClient(type);
    const response = await client.getFavorites();
    return response.favoriteIds;
  }

  /**
   * Check if an item is favorited (Simple API)
   */
  async isFavorite(type: string, id: string): Promise<boolean> {
    try {
      const favorites = await this.listFavorites(type);
      return favorites.includes(id);
    } catch (error) {
      // Fall back to local cache when API fails
      const localFavoritesForType = this.localFavorites.get(type);
      return localFavoritesForType?.has(id) || false;
    }
  }

  /**
   * Toggle favorite status of an item (Simple API)
   */
  async toggleFavorite(type: string, id: string): Promise<boolean> {
    try {
      const isFavorited = await this.isFavorite(type, id);
      if (isFavorited) {
        await this.removeFavoriteSimple(type, id);
        return false;
      } else {
        await this.addFavoriteSimple(type, id);
        return true;
      }
    } catch (error) {
      // Fall back to local cache when API fails
      const isFavorited = await this.isFavorite(type, id);
      
      if (!this.localFavorites.has(type)) {
        this.localFavorites.set(type, new Set());
      }
      const localFavoritesForType = this.localFavorites.get(type)!;
      
      if (isFavorited) {
        localFavoritesForType.delete(id);
        return false;
      } else {
        localFavoritesForType.add(id);
        return true;
      }
    }
  }

  /**
   * Get all favorites across all types (Cross-app functionality)
   */
  async getAllFavorites(): Promise<FavoriteItem[]> {
    const allFavorites: FavoriteItem[] = [];

    // For now, we'll check the types we know about
    // In a real implementation, we might want to get this from a registry
    const knownTypes = ['dashboard', 'saved_search'];

    for (const type of knownTypes) {
      try {
        const client = this.getClient(type);
        const response = await client.getFavorites();
        allFavorites.push(...response.favoriteIds.map((id) => ({ id, type })));
      } catch (error) {
        // Skip types that aren't available or registered
        // console.warn(`Failed to get favorites for type ${type}:`, error);
      }
    }

    return allFavorites;
  }

  /**
   * Get favorites for multiple types (Cross-app functionality)
   */
  async getFavoritesForTypes(types: string[]): Promise<FavoriteItem[]> {
    const favorites: FavoriteItem[] = [];

    for (const type of types) {
      try {
        const client = this.getClient(type);
        const response = await client.getFavorites();
        favorites.push(...response.favoriteIds.map((id) => ({ id, type })));
      } catch (error) {
        // console.warn(`Failed to get favorites for type ${type}:`, error);
      }
    }

    return favorites;
  }
}
