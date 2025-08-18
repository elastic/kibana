/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FavoritesService } from './favorites_service';

/**
 * Example: How Dashboard could use our service as a drop-in replacement
 * 
 * This shows how the existing Dashboard code could be modified to use our
 * enhanced service while maintaining the same interface.
 */

// ============================================================================
// BEFORE: Current Dashboard Implementation
// ============================================================================

/*
// Current Dashboard code:
const dashboardFavoritesClient = useMemo(() => {
  return new FavoritesClient(DASHBOARD_APP_ID, DASHBOARD_CONTENT_ID, {
    http: coreServices.http,
    usageCollection: usageCollectionService,
    userProfile: coreServices.userProfile,
  });
}, []);

// Usage:
const favorites = await dashboardFavoritesClient.getFavorites();
await dashboardFavoritesClient.addFavorite({ id: 'dashboard-123' });
await dashboardFavoritesClient.removeFavorite({ id: 'dashboard-123' });
*/

// ============================================================================
// AFTER: Using Our Enhanced Service
// ============================================================================

export class DashboardFavoritesIntegration {
  private favoritesService: FavoritesService;

  constructor(favoritesService: FavoritesService) {
    // Configure the service for Dashboard app
    this.favoritesService = favoritesService.configureForApp('dashboard', 'dashboard');
  }

  // Drop-in replacement methods (same interface as FavoritesClient)
  async getFavorites() {
    return this.favoritesService.getFavorites();
  }

  async addFavorite(params: { id: string; metadata?: object }) {
    return this.favoritesService.addFavorite(params);
  }

  async removeFavorite(params: { id: string }) {
    return this.favoritesService.removeFavorite(params);
  }

  async isAvailable() {
    return this.favoritesService.isAvailable();
  }

  getFavoriteType() {
    return this.favoritesService.getFavoriteType();
  }

  reportAddFavoriteClick() {
    this.favoritesService.reportAddFavoriteClick();
  }

  reportRemoveFavoriteClick() {
    this.favoritesService.reportRemoveFavoriteClick();
  }

  // Enhanced functionality (new capabilities)
  async getCrossAppFavorites() {
    // Get favorites from multiple apps
    return this.favoritesService.getFavoritesForTypes(['dashboard', 'saved_search']);
  }

  async getAllUserFavorites() {
    // Get all user favorites across all apps
    return this.favoritesService.getAllFavorites();
  }

  async toggleFavorite(id: string) {
    // Simple toggle functionality
    return this.favoritesService.toggleFavorite('dashboard', id);
  }
}

// ============================================================================
// Usage Example
// ============================================================================

export async function dashboardIntegrationExample() {
  // Initialize the service (this would be done in the plugin setup)
  const favoritesService = new FavoritesService({
    http: {} as any, // Mock for example
    userProfile: {} as any,
    usageCollection: {} as any,
  });

  // Create Dashboard integration
  const dashboardFavorites = new DashboardFavoritesIntegration(favoritesService);

  // Use the same interface as before
  const favorites = await dashboardFavorites.getFavorites();
  await dashboardFavorites.addFavorite({ id: 'dashboard-123' });
  await dashboardFavorites.removeFavorite({ id: 'dashboard-123' });

  // Use enhanced functionality
  const crossAppFavorites = await dashboardFavorites.getCrossAppFavorites();
  const allFavorites = await dashboardFavorites.getAllUserFavorites();
  const isNowFavorited = await dashboardFavorites.toggleFavorite('dashboard-456');

  console.log('Dashboard favorites:', favorites);
  console.log('Cross-app favorites:', crossAppFavorites);
  console.log('All user favorites:', allFavorites);
  console.log('Toggle result:', isNowFavorited);
}
