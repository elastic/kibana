/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { favoritesSavedObjectType, FavoritesSavedObjectAttributes } from './favorites_saved_object';

export class FavoritesService {
  constructor(
    private userId: string,
    private namespace: string | undefined,
    private deps: {
      savedObjectClient: SavedObjectsClientContract;
      logger: Logger;
    }
  ) {}

  public async getFavorites({ type }: { type: string }): Promise<{ favoriteIds: string[] }> {
    const favoritesSavedObject = await this.getFavoritesSavedObject();

    const favoriteIds = (favoritesSavedObject?.attributes?.favorites ?? [])
      .filter((favorite) => favorite.type === type)
      .map((favorite) => favorite.id);

    return { favoriteIds };
  }

  public async addFavorite({
    id,
    type,
  }: {
    id: string;
    type: string;
  }): Promise<{ favoriteIds: string[] }> {
    let favoritesSavedObject = await this.getFavoritesSavedObject();

    if (!favoritesSavedObject) {
      favoritesSavedObject = await this.deps.savedObjectClient.create(
        favoritesSavedObjectType.name,
        {
          userId: this.userId,
          favorites: [],
        },
        {
          id: this.userId,
          namespace: this.namespace,
        }
      );
    }

    const newFavoritesState = [
      ...(favoritesSavedObject.attributes.favorites ?? []).filter((favorite) => favorite.id !== id),
      { id, type },
    ];

    await this.deps.savedObjectClient.update(
      favoritesSavedObjectType.name,
      favoritesSavedObject.id,
      {
        favorites: newFavoritesState,
      },
      {
        version: favoritesSavedObject.version,
        namespace: this.namespace,
      }
    );

    return { favoriteIds: newFavoritesState.map((favorite) => favorite.id) };
  }

  public async removeFavorite({
    id,
    type,
  }: {
    id: string;
    type: string;
  }): Promise<{ favoriteIds: string[] }> {
    const favoritesSavedObject = await this.getFavoritesSavedObject();

    if (!favoritesSavedObject) {
      return { favoriteIds: [] };
    }

    const newFavoritesState = (favoritesSavedObject.attributes.favorites ?? []).filter(
      (favorite) => favorite.id !== id
    );

    await this.deps.savedObjectClient.update(
      favoritesSavedObjectType.name,
      favoritesSavedObject.id,
      {
        favorites: newFavoritesState,
      },
      {
        version: favoritesSavedObject.version,
        namespace: this.namespace,
      }
    );

    return {
      favoriteIds: newFavoritesState.map((favorite) => favorite.id),
    };
  }

  private async getFavoritesSavedObject(): Promise<SavedObject<FavoritesSavedObjectAttributes> | null> {
    try {
      const favoritesSavedObject =
        await this.deps.savedObjectClient.get<FavoritesSavedObjectAttributes>(
          favoritesSavedObjectType.name,
          this.userId,
          { namespace: this.namespace }
        );

      return favoritesSavedObject;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return null;
      }

      throw e;
    }
  }
}
