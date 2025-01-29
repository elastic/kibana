/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { registerFavoritesRoutes } from './favorites_routes';
import { favoritesSavedObjectType } from './favorites_saved_object';
import { registerFavoritesUsageCollection } from './favorites_usage_collection';
import { FavoritesRegistry, FavoritesRegistrySetup } from './favorites_registry';

export type {
  GetFavoritesResponse,
  AddFavoriteResponse,
  RemoveFavoriteResponse,
} from './favorites_routes';

/**
 * @public
 * Setup contract for the favorites feature.
 */
export type FavoritesSetup = FavoritesRegistrySetup;

/**
 * @public
 * Registers the favorites feature enabling favorites saved object type and api routes.
 *
 * @param logger
 * @param core
 * @param usageCollection
 */
export function registerFavorites({
  logger,
  core,
  usageCollection,
}: {
  core: CoreSetup;
  logger: Logger;
  usageCollection?: UsageCollectionSetup;
}): FavoritesSetup {
  const favoritesRegistry = new FavoritesRegistry();
  core.savedObjects.registerType(favoritesSavedObjectType);
  registerFavoritesRoutes({ core, logger, favoritesRegistry });

  if (usageCollection) {
    registerFavoritesUsageCollection({ core, usageCollection });
  }

  return favoritesRegistry;
}
