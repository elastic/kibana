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

export const registerCreateRoute = (router: IRouter) => {
  router.post(
    {
      path: `${KBN_CLIENT_API_PREFIX}/{type}/{id?}`,
      options: {
        tags: ['access:ftrApis'],
      },
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.maybe(schema.string()),
        }),
        query: schema.object({
          overwrite: schema.boolean({ defaultValue: false }),
        }),
        body: schema.object({
          attributes: schema.recordOf(schema.string(), schema.any()),
          migrationVersion: schema.maybe(schema.recordOf(schema.string(), schema.string())),
          references: schema.maybe(
            schema.arrayOf(
              schema.object({
                name: schema.string(),
                type: schema.string(),
                id: schema.string(),
              })
            )
          ),
        }),
      },
    },
    catchAndReturnBoomErrors(async (ctx, req, res) => {
      const { type, id } = req.params;
      const { overwrite } = req.query;
      const { attributes, migrationVersion, references } = req.body;
      const { savedObjects } = await ctx.core;

      const hiddenTypes = listHiddenTypes(savedObjects.typeRegistry);
      const soClient = savedObjects.getClient({ includedHiddenTypes: hiddenTypes });

      const options = {
        id,
        overwrite,
        migrationVersion,
        references,
      };
      const result = await soClient.create(type, attributes, options);
      return res.ok({ body: result });
    })
  );
};
