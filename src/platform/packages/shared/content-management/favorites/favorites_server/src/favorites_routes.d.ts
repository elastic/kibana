/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { FavoritesRegistry } from './favorites_registry';
/**
 * @public
 * Response for get favorites API
 */
export interface GetFavoritesResponse {
  favoriteIds: string[];
  favoriteMetadata?: Record<string, object>;
}
export interface AddFavoriteResponse {
  favoriteIds: string[];
}
export interface RemoveFavoriteResponse {
  favoriteIds: string[];
}
export declare function registerFavoritesRoutes({
  core,
  logger,
  favoritesRegistry,
}: {
  core: CoreSetup;
  logger: Logger;
  favoritesRegistry: FavoritesRegistry;
}): void;
