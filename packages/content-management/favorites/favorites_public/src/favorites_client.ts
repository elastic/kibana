/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { GetFavoritesResponse } from '@kbn/content-management-favorites-server';

export interface FavoritesClientPublic {
  getFavorites(): Promise<GetFavoritesResponse>;
  addFavorite({ id }: { id: string }): Promise<GetFavoritesResponse>;
  removeFavorite({ id }: { id: string }): Promise<GetFavoritesResponse>;

  getFavoriteType(): string;
}

export class FavoritesClient implements FavoritesClientPublic {
  constructor(private favoriteObjectType: string, private deps: { http: HttpStart }) {}

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
}
