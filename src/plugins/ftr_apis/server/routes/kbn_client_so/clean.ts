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

export const registerCleanRoute = (router: IRouter) => {
  router.post(
    {
      path: `${KBN_CLIENT_API_PREFIX}/_clean`,
      options: {
        tags: ['access:ftrApis'],
      },
      validate: {
        body: schema.object({
          types: schema.arrayOf(schema.string()),
        }),
      },
    },
    catchAndReturnBoomErrors(async (ctx, req, res) => {
      const { types } = req.body;
      const { savedObjects } = await ctx.core;
      const hiddenTypes = listHiddenTypes(savedObjects.typeRegistry);
      const soClient = savedObjects.getClient({ includedHiddenTypes: hiddenTypes });

      const finder = soClient.createPointInTimeFinder({ type: types, perPage: 100 });
      let deleted = 0;

      for await (const response of finder.find()) {
        const objects = response.saved_objects.map(({ type, id }) => ({ type, id }));
        const { statuses } = await soClient.bulkDelete(objects, { force: true });
        deleted += statuses.filter((status) => status.success).length;
      }

      return res.ok({
        body: {
          deleted,
        },
      });
    })
  );
};
