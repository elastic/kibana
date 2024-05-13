/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { KBN_CLIENT_API_PREFIX, listHiddenTypes, catchAndReturnBoomErrors } from './utils';

export const registerFindRoute = (router: IRouter) => {
  router.get(
    {
      path: `${KBN_CLIENT_API_PREFIX}/_find`,
      options: {
        tags: ['access:ftrApis'],
      },
      validate: {
        query: schema.object({
          per_page: schema.number({ min: 0, defaultValue: 20 }),
          page: schema.number({ min: 0, defaultValue: 1 }),
          type: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
          search: schema.maybe(schema.string()),
          fields: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
        }),
      },
    },
    catchAndReturnBoomErrors(async (ctx, req, res) => {
      const query = req.query;

      const { savedObjects } = await ctx.core;
      const hiddenTypes = listHiddenTypes(savedObjects.typeRegistry);
      const soClient = savedObjects.getClient({ includedHiddenTypes: hiddenTypes });

      const result = await soClient.find({
        perPage: query.per_page,
        page: query.page,
        type: Array.isArray(query.type) ? query.type : [query.type],
        search: query.search,
        fields: typeof query.fields === 'string' ? [query.fields] : query.fields,
      });

      return res.ok({ body: result });
    })
  );
};
