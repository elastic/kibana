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
import { FavoritesService, FavoritesLimitExceededError } from './favorites_service';
import { favoritesSavedObjectType } from './favorites_saved_object';
import { FavoritesRegistry } from './favorites_registry';

/**
 * @public
 * Response for get favorites API
 */
export interface GetFavoritesResponse {
  favoriteIds: string[];
  favoriteMetadata?: Record<string, object>;
}

export interface AddFavoriteResponse {
  favoriteIds: string[];
}

export interface RemoveFavoriteResponse {
  favoriteIds: string[];
}

export function registerFavoritesRoutes({
  core,
  logger,
  favoritesRegistry,
}: {
  core: CoreSetup;
  logger: Logger;
  favoritesRegistry: FavoritesRegistry;
}) {
  const typeSchema = schema.string({
    validate: (type) => {
      if (!favoritesRegistry.hasType(type)) {
        return `Unknown favorite type: ${type}`;
      }
    },
  });

  const metadataSchema = schema.maybe(
    schema.object(
      {
        // validated later by the registry depending on the type
      },
      {
        unknowns: 'allow',
      }
    )
  );

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
        body: schema.maybe(
          schema.nullable(
            schema.object({
              metadata: metadataSchema,
            })
          )
        ),
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
        favoritesRegistry,
      });

      const id = request.params.id;
      const metadata = request.body?.metadata;

      try {
        favoritesRegistry.validateMetadata(type, metadata);
      } catch (e) {
        return response.badRequest({ body: { message: e.message } });
      }

      try {
        const favoritesResult = await favorites.addFavorite({
          id,
          metadata,
        });
        const addFavoritesResponse: AddFavoriteResponse = {
          favoriteIds: favoritesResult.favoriteIds,
        };

        return response.ok({ body: addFavoritesResponse });
      } catch (e) {
        if (e instanceof FavoritesLimitExceededError) {
          return response.forbidden({ body: { message: e.message } });
        }

        throw e; // unexpected error, let the global error handler deal with it
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
        favoritesRegistry,
      });

      const favoritesResult: GetFavoritesResponse = await favorites.removeFavorite({
        id: request.params.id,
      });

      const removeFavoriteResponse: RemoveFavoriteResponse = {
        favoriteIds: favoritesResult.favoriteIds,
      };

      return response.ok({ body: removeFavoriteResponse });
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
        favoritesRegistry,
      });

      const favoritesResult = await favorites.getFavorites();

      const favoritesResponse: GetFavoritesResponse = {
        favoriteIds: favoritesResult.favoriteIds,
        favoriteMetadata: favoritesResult.favoriteMetadata,
      };

      return response.ok({
        body: favoritesResponse,
      });
    }
  );
}
