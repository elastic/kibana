/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsRouter } from '../types';
import type { SavedObjectCommon, FindResponseHTTP } from '../../common';

export const registerFindRoute = (router: SavedObjectsRouter) => {
  router.get(
    {
      path: '/internal/saved-objects-finder/find',
      validate: {
        query: schema.object({
          perPage: schema.number({ min: 0, defaultValue: 20 }),
          page: schema.number({ min: 0, defaultValue: 1 }),
          type: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
          search: schema.maybe(schema.string()),
          defaultSearchOperator: schema.oneOf([schema.literal('AND'), schema.literal('OR')]),
          sortField: schema.maybe(schema.string()),
          sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
          fields: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
            defaultValue: [],
          }),
          searchFields: schema.maybe(schema.arrayOf(schema.string())),
          hasReference: schema.maybe(schema.string()),
        }),
      },
      options: {
        authRequired: 'optional',
      },
    },
    async (ctx, req, res) => {
      const savedObjectsClient = (await ctx.core).savedObjects.client;
      const { query } = req;

      const searchTypes = Array.isArray(query.type) ? query.type : [query.type];
      const includedFields = Array.isArray(query.fields) ? query.fields : [query.fields];

      const findResponse = await savedObjectsClient.find<SavedObjectCommon<any>>({
        ...query,
        type: searchTypes,
        fields: includedFields,
        hasReference: query.hasReference ? JSON.parse(query.hasReference) : undefined,
      });

      const savedObjects = findResponse.saved_objects;

      const response: FindResponseHTTP<any> = {
        saved_objects: savedObjects,
        total: findResponse.total,
        per_page: findResponse.per_page,
        page: findResponse.page,
      };

      return res.ok({ body: response });
    }
  );
};
