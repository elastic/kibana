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
    private readonly type: string,
    private readonly userId: string,
    private readonly deps: {
      savedObjectClient: SavedObjectsClientContract;
      logger: Logger;
    }
  ) {
    if (!this.userId || !this.type) {
      // This should never happen, but just in case let's do a runtime check
      throw new Error('userId and object type are required to use a favorite service');
    }
  }

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
          favoriteIds: [id],
        },
        {
          id: this.getFavoriteSavedObjectId(),
        }
      );

      return { favoriteIds: favoritesSavedObject.attributes.favoriteIds };
    } else {
      const newFavoriteIds = [
        ...(favoritesSavedObject.attributes.favoriteIds ?? []).filter(
          (favoriteId) => favoriteId !== id
        ),
        id,
      ];

      await this.deps.savedObjectClient.update(
        favoritesSavedObjectType.name,
        favoritesSavedObject.id,
        {
          favoriteIds: newFavoriteIds,
        },
        {
          version: favoritesSavedObject.version,
        }
      );

      return { favoriteIds: newFavoriteIds };
    }
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
          this.getFavoriteSavedObjectId()
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
    return `${this.type}:${this.userId}`;
  }
}
