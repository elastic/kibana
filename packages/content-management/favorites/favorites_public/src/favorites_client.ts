/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { GetFavoritesResponse } from '@kbn/content-management-favorites-server';

export interface FavoritesClientPublic {
  getFavorites(): Promise<GetFavoritesResponse>;
  addFavorite({ id }: { id: string }): Promise<GetFavoritesResponse>;
  removeFavorite({ id }: { id: string }): Promise<GetFavoritesResponse>;

  getFavoriteType(): string;
  reportAddFavoriteClick(): void;
  reportRemoveFavoriteClick(): void;
}

export class FavoritesClient implements FavoritesClientPublic {
  constructor(
    private readonly appName: string,
    private readonly favoriteObjectType: string,
    private readonly deps: { http: HttpStart; usageCollection?: UsageCollectionStart }
  ) {}

  public async getFavorites(): Promise<GetFavoritesResponse> {
    return this.deps.http.get(`/internal/content_management/favorites/${this.favoriteObjectType}`);
  }

  public async addFavorite({ id }: { id: string }): Promise<GetFavoritesResponse> {
    return this.deps.http.post(
      `/internal/content_management/favorites/${this.favoriteObjectType}/${id}/favorite`
    );
  }

  public async removeFavorite({ id }: { id: string }): Promise<GetFavoritesResponse> {
    return this.deps.http.post(
      `/internal/content_management/favorites/${this.favoriteObjectType}/${id}/unfavorite`
    );
  }

  public getFavoriteType() {
    return this.favoriteObjectType;
  }

  public reportAddFavoriteClick() {
    this.deps.usageCollection?.reportUiCounter(this.appName, 'click', 'add_favorite');
  }
  public reportRemoveFavoriteClick() {
    this.deps.usageCollection?.reportUiCounter(this.appName, 'click', 'remove_favorite');
  }
}
