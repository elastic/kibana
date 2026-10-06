/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ObjectType } from '@kbn/config-schema';
interface FavoriteTypeConfig {
  typeMetadataSchema?: ObjectType;
}
export type FavoritesRegistrySetup = Pick<FavoritesRegistry, 'registerFavoriteType'>;
export declare class FavoritesRegistry {
  private favoriteTypes;
  registerFavoriteType(type: string, config?: FavoriteTypeConfig): void;
  hasType(type: string): boolean;
  validateMetadata(type: string, metadata?: object): void;
}
export {};
