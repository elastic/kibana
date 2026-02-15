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
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { FavoritesSavedObjectAttributes } from './favorites_saved_object';
import { favoritesSavedObjectType } from './favorites_saved_object';

/**
 * Gets favorite IDs for multiple types for a given user.
 *
 * This function is useful for filtering content lists by favorites,
 * where you need to fetch favorites across multiple saved object types
 * in a single operation.
 *
 * @param types - Array of saved object types to fetch favorites for.
 * @param userId - The user's profile UID.
 * @param deps - Dependencies including the saved object client and logger.
 * @returns A map of type to favorite IDs for that type. Types with no favorites are omitted.
 *
 * @example
 * ```ts
 * const favoritesByType = await getFavoritesForTypes(
 *   ['dashboard', 'visualization'],
 *   userId,
 *   { savedObjectClient, logger }
 * );
 * // Map { 'dashboard' => ['dash-1', 'dash-2'], 'visualization' => ['viz-1'] }
 * ```
 */
export const getFavoritesForTypes = async (
  types: string[],
  userId: string,
  deps: {
    savedObjectClient: SavedObjectsClientContract;
    logger: Logger;
  }
): Promise<Map<string, string[]>> => {
  const { savedObjectClient, logger } = deps;
  const result = new Map<string, string[]>();

  for (const type of types) {
    try {
      const favoritesSavedObjectId = `${type}:${userId}`;
      const favoritesSo = await savedObjectClient.get<FavoritesSavedObjectAttributes>(
        favoritesSavedObjectType.name,
        favoritesSavedObjectId
      );

      const favoriteIds = favoritesSo.attributes.favoriteIds ?? [];
      if (favoriteIds.length > 0) {
        result.set(type, favoriteIds);
      }
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        // No favorites saved object exists for this type—skip it.
        continue;
      }
      logger.error(`Error fetching favorites for type ${type}: ${e}`);
      throw e;
    }
  }

  return result;
};
