/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ObjectType } from '@kbn/config-schema';

interface FavoriteTypeConfig {
  typeMetadataSchema?: ObjectType;
}

export type FavoritesRegistrySetup = Pick<FavoritesRegistry, 'registerFavoriteType'>;

export class FavoritesRegistry {
  private favoriteTypes = new Map<string, FavoriteTypeConfig>();

  registerFavoriteType(type: string, config: FavoriteTypeConfig = {}) {
    if (this.favoriteTypes.has(type)) {
      throw new Error(`Favorite type ${type} is already registered`);
    }

    this.favoriteTypes.set(type, config);
  }

  hasType(type: string) {
    return this.favoriteTypes.has(type);
  }

  validateMetadata(type: string, metadata?: object) {
    if (!this.hasType(type)) {
      throw new Error(`Favorite type ${type} is not registered`);
    }

    const typeConfig = this.favoriteTypes.get(type)!;
    const typeMetadataSchema = typeConfig.typeMetadataSchema;

    if (typeMetadataSchema) {
      typeMetadataSchema.validate(metadata);
    } else {
      if (metadata === undefined) {
        return; /* ok */
      } else {
        throw new Error(`Favorite type ${type} does not support metadata`);
      }
    }
  }
}
