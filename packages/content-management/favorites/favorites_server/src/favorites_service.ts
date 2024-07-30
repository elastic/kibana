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
    private namespace: string | undefined,
    private type: string,
    private userId: string,
    private deps: {
      savedObjectClient: SavedObjectsClientContract;
      logger: Logger;
    }
  ) {}

  public async getFavorites(): Promise<{ favoriteIds: string[] }> {
    const favoritesSavedObject = await this.getFavoritesSavedObject();

    const favoriteIds = favoritesSavedObject?.attributes?.favoriteIds ?? [];

    return { favoriteIds };
  }

  public async addFavorite({ id }: { id: string }): Promise<{ favoriteIds: string[] }> {
    let favoritesSavedObject = await this.getFavoritesSavedObject();

    if (!favoritesSavedObject) {
      favoritesSavedObject = await this.deps.savedObjectClient.create(
        favoritesSavedObjectType.name,
        {
          userId: this.userId,
          type: this.type,
          favoriteIds: [],
        },
        {
          id: this.getFavoriteSavedObjectId(),
          namespace: this.namespace,
        }
      );
    }

    const newFavoriteIds = [...(favoritesSavedObject.attributes.favoriteIds ?? []), id];

    await this.deps.savedObjectClient.update(
      favoritesSavedObjectType.name,
      favoritesSavedObject.id,
      {
        favoriteIds: newFavoriteIds,
      },
      {
        version: favoritesSavedObject.version,
        namespace: this.namespace,
      }
    );

    return { favoriteIds: newFavoriteIds };
  }

  public async removeFavorite({ id }: { id: string }): Promise<{ favoriteIds: string[] }> {
    const favoritesSavedObject = await this.getFavoritesSavedObject();

    if (!favoritesSavedObject) {
      return { favoriteIds: [] };
    }

    const newFavoriteIds = (favoritesSavedObject.attributes.favoriteIds ?? []).filter(
      (favoriteId) => favoriteId !== id
    );

    await this.deps.savedObjectClient.update(
      favoritesSavedObjectType.name,
      favoritesSavedObject.id,
      {
        favoriteIds: newFavoriteIds,
      },
      {
        version: favoritesSavedObject.version,
        namespace: this.namespace,
      }
    );

    return {
      favoriteIds: newFavoriteIds,
    };
  }

  private async getFavoritesSavedObject(): Promise<SavedObject<FavoritesSavedObjectAttributes> | null> {
    try {
      const favoritesSavedObject =
        await this.deps.savedObjectClient.get<FavoritesSavedObjectAttributes>(
          favoritesSavedObjectType.name,
          this.getFavoriteSavedObjectId(),
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

  private getFavoriteSavedObjectId() {
    if (!this.userId) {
      // This should never happen, but it's better to throw an error than to create a saved object with an invalid ID
      throw new Error('userId is required to create a favorite saved object');
    }

    if (!this.type) {
      // This should never happen, but it's better to throw an error than to create a saved object with an invalid ID
      throw new Error('type is required to create a favorite saved object');
    }

    return `${this.type}:${this.userId}`;
  }
}
