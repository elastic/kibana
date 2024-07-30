/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Logger, SavedObjectsClient } from '@kbn/core/server';
import { once } from 'lodash';
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

  const getSavedObjectClient = once(async () => {
    const [coreStart] = await core.getStartServices();

    // We need an internal client to access the `favorite` type which not every user has access to
    // and give access only to the current user's favorites through this API
    const internalClient = new SavedObjectsClient(
      coreStart.savedObjects.createInternalRepository([favoritesSavedObjectType.name])
    );
    return internalClient;
  });

  router.post(
    {
      path: '/internal/content_management/favorites/{type}/{id}/favorite',
      validate: {
        params: schema.object({
          id: schema.string(),
          type: typeSchema,
        }),
      },
    },
    async (requestHandlerContext, request, response) => {
      const coreRequestHandlerContext = await requestHandlerContext.core;

      const userId = coreRequestHandlerContext.security.authc.getCurrentUser()?.profile_uid;

      if (!userId) {
        return response.forbidden();
      }

      const type = request.params.type;

      const currentNamespace = coreRequestHandlerContext.savedObjects.client.getCurrentNamespace();

      const favorites = new FavoritesService(currentNamespace, type, userId, {
        savedObjectClient: await getSavedObjectClient(),
        logger,
      });

      try {
        const favoriteIds: GetFavoritesResponse = await favorites.addFavorite({
          id: request.params.id,
        });
        return response.ok({ body: favoriteIds });
      } catch (e) {
        logger.error(e);
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Something went wrong. Check the server logs for more information.',
          },
        });
      }
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
    },
    async (requestHandlerContext, request, response) => {
      const coreRequestHandlerContext = await requestHandlerContext.core;
      const userId = coreRequestHandlerContext.security.authc.getCurrentUser()?.profile_uid;

      if (!userId) {
        return response.forbidden();
      }

      const type = request.params.type;

      const currentNamespace = coreRequestHandlerContext.savedObjects.client.getCurrentNamespace();

      const favorites = new FavoritesService(currentNamespace, type, userId, {
        savedObjectClient: await getSavedObjectClient(),
        logger,
      });

      try {
        const favoriteIds: GetFavoritesResponse = await favorites.removeFavorite({
          id: request.params.id,
        });
        return response.ok({ body: favoriteIds });
      } catch (e) {
        logger.error(e);
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Something went wrong. Check the server logs for more information.',
          },
        });
      }
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
    },
    async (requestHandlerContext, request, response) => {
      const coreRequestHandlerContext = await requestHandlerContext.core;
      const userId = coreRequestHandlerContext.security.authc.getCurrentUser()?.profile_uid;

      if (!userId) {
        return response.forbidden();
      }

      const currentNamespace = coreRequestHandlerContext.savedObjects.client.getCurrentNamespace();

      const type = request.params.type;

      const favorites = new FavoritesService(currentNamespace, type, userId, {
        savedObjectClient: await getSavedObjectClient(),
        logger,
      });

      try {
        const getFavoritesResponse: GetFavoritesResponse = await favorites.getFavorites();

        return response.ok({
          body: getFavoritesResponse,
        });
      } catch (e) {
        logger.error(e);
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Something went wrong. Check the server logs for more information.',
          },
        });
      }
    }
  );
}
