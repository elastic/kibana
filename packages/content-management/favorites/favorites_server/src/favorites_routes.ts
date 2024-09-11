/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CoreRequestHandlerContext,
  CoreSetup,
  Logger,
  SECURITY_EXTENSION_ID,
} from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { FavoritesService } from './favorites_service';
import { favoritesSavedObjectType } from './favorites_saved_object';

// only dashboard is supported for now
// TODO: make configurable or allow any string
const typeSchema = schema.oneOf([schema.literal('dashboard')]);

/**
 * @public
 * Response for get favorites API
 */
export interface GetFavoritesResponse {
  favoriteIds: string[];
}

export function registerFavoritesRoutes({ core, logger }: { core: CoreSetup; logger: Logger }) {
  const router = core.http.createRouter();

  const getSavedObjectClient = (coreRequestHandlerContext: CoreRequestHandlerContext) => {
    // We need to exclude security extension to access the `favorite` type which not every user has access to
    // and give access only to the current user's favorites through this API
    return coreRequestHandlerContext.savedObjects.getClient({
      includedHiddenTypes: [favoritesSavedObjectType.name],
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });
  };

  router.post(
    {
      path: '/internal/content_management/favorites/{type}/{id}/favorite',
      validate: {
        params: schema.object({
          id: schema.string(),
          type: typeSchema,
        }),
      },
      // we don't protect the route with any access tags as
      // we only give access to the current user's favorites ids
    },
    async (requestHandlerContext, request, response) => {
      const coreRequestHandlerContext = await requestHandlerContext.core;

      const userId = coreRequestHandlerContext.security.authc.getCurrentUser()?.profile_uid;

      if (!userId) {
        return response.forbidden();
      }

      const type = request.params.type;

      const favorites = new FavoritesService(type, userId, {
        savedObjectClient: getSavedObjectClient(coreRequestHandlerContext),
        logger,
      });

      const favoriteIds: GetFavoritesResponse = await favorites.addFavorite({
        id: request.params.id,
      });

      return response.ok({ body: favoriteIds });
    }
  );

  router.post(
    {
      path: '/internal/content_management/favorites/{type}/{id}/unfavorite',
      validate: {
        params: schema.object({
          id: schema.string(),
          type: typeSchema,
        }),
      },
      // we don't protect the route with any access tags as
      // we only give access to the current user's favorites ids
    },
    async (requestHandlerContext, request, response) => {
      const coreRequestHandlerContext = await requestHandlerContext.core;
      const userId = coreRequestHandlerContext.security.authc.getCurrentUser()?.profile_uid;

      if (!userId) {
        return response.forbidden();
      }

      const type = request.params.type;

      const favorites = new FavoritesService(type, userId, {
        savedObjectClient: getSavedObjectClient(coreRequestHandlerContext),
        logger,
      });

      const favoriteIds: GetFavoritesResponse = await favorites.removeFavorite({
        id: request.params.id,
      });
      return response.ok({ body: favoriteIds });
    }
  );

  router.get(
    {
      path: '/internal/content_management/favorites/{type}',
      validate: {
        params: schema.object({
          type: typeSchema,
        }),
      },
      // we don't protect the route with any access tags as
      // we only give access to the current user's favorites ids
    },
    async (requestHandlerContext, request, response) => {
      const coreRequestHandlerContext = await requestHandlerContext.core;
      const userId = coreRequestHandlerContext.security.authc.getCurrentUser()?.profile_uid;

      if (!userId) {
        return response.forbidden();
      }

      const type = request.params.type;

      const favorites = new FavoritesService(type, userId, {
        savedObjectClient: getSavedObjectClient(coreRequestHandlerContext),
        logger,
      });

      const getFavoritesResponse: GetFavoritesResponse = await favorites.getFavorites();

      return response.ok({
        body: getFavoritesResponse,
      });
    }
  );
}
