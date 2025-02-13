/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line max-classes-per-file
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { FAVORITES_LIMIT } from '@kbn/content-management-favorites-common';
import { Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { favoritesSavedObjectType, FavoritesSavedObjectAttributes } from './favorites_saved_object';
import { FavoritesRegistry } from './favorites_registry';

export interface FavoritesState {
  favoriteIds: string[];
  favoriteMetadata?: Record<string, object>;
}

export class FavoritesService {
  constructor(
    private readonly type: string,
    private readonly userId: string,
    private readonly deps: {
      savedObjectClient: SavedObjectsClientContract;
      logger: Logger;
      favoritesRegistry: FavoritesRegistry;
    }
  ) {
    if (!this.userId || !this.type) {
      // This should never happen, but just in case let's do a runtime check
      throw new Error('userId and object type are required to use a favorite service');
    }

    if (!this.deps.favoritesRegistry.hasType(this.type)) {
      throw new Error(`Favorite type ${this.type} is not registered`);
    }
  }

  public async getFavorites(): Promise<FavoritesState> {
    const favoritesSavedObject = await this.getFavoritesSavedObject();

    const favoriteIds = favoritesSavedObject?.attributes?.favoriteIds ?? [];
    const favoriteMetadata = favoritesSavedObject?.attributes?.favoriteMetadata;

    return { favoriteIds, favoriteMetadata };
  }

  /**
   * @throws {FavoritesLimitExceededError}
   */
  public async addFavorite({
    id,
    metadata,
  }: {
    id: string;
    metadata?: object;
  }): Promise<FavoritesState> {
    let favoritesSavedObject = await this.getFavoritesSavedObject();

    if (!favoritesSavedObject) {
      favoritesSavedObject = await this.deps.savedObjectClient.create(
        favoritesSavedObjectType.name,
        {
          userId: this.userId,
          type: this.type,
          favoriteIds: [id],
          ...(metadata
            ? {
                favoriteMetadata: {
                  [id]: metadata,
                },
              }
            : {}),
        },
        {
          id: this.getFavoriteSavedObjectId(),
        }
      );

      return {
        favoriteIds: favoritesSavedObject.attributes.favoriteIds,
        favoriteMetadata: favoritesSavedObject.attributes.favoriteMetadata,
      };
    } else {
      if ((favoritesSavedObject.attributes.favoriteIds ?? []).length >= FAVORITES_LIMIT) {
        throw new FavoritesLimitExceededError();
      }

      const newFavoriteIds = [
        ...(favoritesSavedObject.attributes.favoriteIds ?? []).filter(
          (favoriteId) => favoriteId !== id
        ),
        id,
      ];

      const newFavoriteMetadata = metadata
        ? {
            ...favoritesSavedObject.attributes.favoriteMetadata,
            [id]: metadata,
          }
        : undefined;

      await this.deps.savedObjectClient.update(
        favoritesSavedObjectType.name,
        favoritesSavedObject.id,
        {
          favoriteIds: newFavoriteIds,
          ...(newFavoriteMetadata
            ? {
                favoriteMetadata: newFavoriteMetadata,
              }
            : {}),
        },
        {
          version: favoritesSavedObject.version,
        }
      );

      return { favoriteIds: newFavoriteIds, favoriteMetadata: newFavoriteMetadata };
    }
  }

  public async removeFavorite({ id }: { id: string }): Promise<FavoritesState> {
    const favoritesSavedObject = await this.getFavoritesSavedObject();

    if (!favoritesSavedObject) {
      return { favoriteIds: [] };
    }

    const newFavoriteIds = (favoritesSavedObject.attributes.favoriteIds ?? []).filter(
      (favoriteId) => favoriteId !== id
    );

    const newFavoriteMetadata = favoritesSavedObject.attributes.favoriteMetadata
      ? { ...favoritesSavedObject.attributes.favoriteMetadata }
      : undefined;

    if (newFavoriteMetadata) {
      delete newFavoriteMetadata[id];
    }

    await this.deps.savedObjectClient.update(
      favoritesSavedObjectType.name,
      favoritesSavedObject.id,
      {
        ...favoritesSavedObject.attributes,
        favoriteIds: newFavoriteIds,
        ...(newFavoriteMetadata
          ? {
              favoriteMetadata: newFavoriteMetadata,
            }
          : {}),
      },
      {
        version: favoritesSavedObject.version,
        // We don't want to merge the attributes here because we want to remove the keys from the metadata
        mergeAttributes: false,
      }
    );

    return {
      favoriteIds: newFavoriteIds,
      favoriteMetadata: newFavoriteMetadata,
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

export class FavoritesLimitExceededError extends Error {
  constructor() {
    super(
      `Limit reached: This list can contain a maximum of ${FAVORITES_LIMIT} items. Please remove an item before adding a new one.`
    );

    this.name = 'FavoritesLimitExceededError';
    Object.setPrototypeOf(this, FavoritesLimitExceededError.prototype); // For TypeScript compatibility
  }
}
