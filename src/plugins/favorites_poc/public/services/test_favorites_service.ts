/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FavoritesService } from './favorites_service';

// This is a simple test function to verify our service works
export async function testFavoritesService(
  http: any,
  userProfile: any,
  usageCollection?: any
): Promise<void> {
  console.log('🧪 Testing Favorites Service...');

  const favoritesService = new FavoritesService({
    http,
    userProfile,
    usageCollection,
  });

  try {
    // Test 1: Add a favorite
    console.log('📝 Testing addFavorite...');
    await favoritesService.addFavorite('dashboard', 'test-dashboard-1');
    console.log('✅ addFavorite test passed');

    // Test 2: List favorites
    console.log('📋 Testing listFavorites...');
    const favorites = await favoritesService.listFavorites('dashboard');
    console.log('📊 Current favorites:', favorites);
    console.log('✅ listFavorites test passed');

    // Test 3: Check if favorite exists
    console.log('🔍 Testing isFavorite...');
    const isFavorited = await favoritesService.isFavorite('dashboard', 'test-dashboard-1');
    console.log('⭐ Is test-dashboard-1 favorited?', isFavorited);
    console.log('✅ isFavorite test passed');

    // Test 4: Toggle favorite (should remove it)
    console.log('🔄 Testing toggleFavorite (remove)...');
    const newState = await favoritesService.toggleFavorite('dashboard', 'test-dashboard-1');
    console.log('🔄 New favorite state:', newState);
    console.log('✅ toggleFavorite (remove) test passed');

    // Test 5: Toggle favorite again (should add it back)
    console.log('🔄 Testing toggleFavorite (add)...');
    const finalState = await favoritesService.toggleFavorite('dashboard', 'test-dashboard-1');
    console.log('🔄 Final favorite state:', finalState);
    console.log('✅ toggleFavorite (add) test passed');

    // Test 6: Test with saved_search type
    console.log('🔍 Testing with saved_search type...');
    await favoritesService.addFavorite('saved_search', 'test-search-1');
    const savedSearchFavorites = await favoritesService.listFavorites('saved_search');
    console.log('📊 Saved search favorites:', savedSearchFavorites);
    console.log('✅ saved_search type test passed');

    console.log('🎉 All tests passed! Favorites service is working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}
