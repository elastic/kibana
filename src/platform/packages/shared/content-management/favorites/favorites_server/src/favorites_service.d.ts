/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import type { FavoritesRegistry } from './favorites_registry';
export interface FavoritesState {
  favoriteIds: string[];
  favoriteMetadata?: Record<string, object>;
}
export declare class FavoritesService {
  private readonly type;
  private readonly userId;
  private readonly deps;
  constructor(
    type: string,
    userId: string,
    deps: {
      savedObjectClient: SavedObjectsClientContract;
      logger: Logger;
      favoritesRegistry: FavoritesRegistry;
    }
  );
  getFavorites(): Promise<FavoritesState>;
  /**
   * @throws {FavoritesLimitExceededError}
   */
  addFavorite({ id, metadata }: { id: string; metadata?: object }): Promise<FavoritesState>;
  removeFavorite({ id }: { id: string }): Promise<FavoritesState>;
  private getFavoritesSavedObject;
  private getFavoriteSavedObjectId;
}
export declare class FavoritesLimitExceededError extends Error {
  constructor();
}
