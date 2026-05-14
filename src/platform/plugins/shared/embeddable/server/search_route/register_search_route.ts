/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core-http-server';
import type { RequestHandlerContext, SavedObjectsFindOptionsReference } from '@kbn/core/server';

export function registerSearchRoute(router: IRouter<RequestHandlerContext>) {
  router.post(
    {
      path: '/internal/embeddable/fetch_saved_objects',
      validate: {
        request: {
          body: schema.object({
            type: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
            search: schema.maybe(schema.string()),
            limit: schema.maybe(schema.number()),
            tags: schema.maybe(
              schema.object({
                included: schema.arrayOf(schema.string()),
                excluded: schema.arrayOf(schema.string()),
              })
            ),
          }),
        },
        response: {
          200: {
            body: () =>
              schema.object({
                hits: schema.arrayOf(schema.any()),
                total: schema.number(),
              }),
            description: 'success',
          },
        },
      },
      security: {
        authz: {
          requiredPrivileges: ['read'],
        },
      },
    },
    async (ctx, req, res) => {
      const { core } = await ctx.resolve(['core']);
      const { type, search, tags, limit } = req.body;

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

const tagIdToSavedObjectReference = (tagId: string): SavedObjectsFindOptionsReference => ({
  type: 'tag',
  id: tagId,
});
