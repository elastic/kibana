/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core-http-server';
import type { RequestHandlerContext, SavedObjectsFindOptionsReference } from '@kbn/core/server';
import { SEARCH_ROUTE_PATH } from '../../common/constants';
import { searchLibraryRequestSchema, searchLibraryResponseSchema } from './types';

export function registerSearchRoute(router: IRouter<RequestHandlerContext>) {
  router.post(
    {
      path: SEARCH_ROUTE_PATH,
      validate: {
        request: {
          body: searchLibraryRequestSchema,
        },
        response: {
          200: {
            body: () => searchLibraryResponseSchema,
            description: 'success',
          },
          403: {
            description: 'forbidden',
          },
        },
      },
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization because the it is just a wrapper around the Saved Object client',
        },
      },
    },
    async (ctx, req, res) => {
      const { core } = await ctx.resolve(['core']);
      const { type, search, tags, limit } = req.body;

      const tagIdToSavedObjectReference = (tagId: string): SavedObjectsFindOptionsReference => ({
        type: 'tag',
        id: tagId,
      });

      try {
        const savedObjectResult = await core.savedObjects.client.find({
          type,
          search,
          searchFields: [`title^3`, `description`],
          defaultSearchOperator: 'AND',
          perPage: limit,
          hasReference: tags?.included?.map(tagIdToSavedObjectReference),
          hasNoReference: tags?.excluded?.map(tagIdToSavedObjectReference),
        });
        return res.ok({
          body: { hits: savedObjectResult.saved_objects, total: savedObjectResult.total },
        });
      } catch (e) {
        return res.badRequest({ body: { message: e.message } });
      }
    }
  );
}
