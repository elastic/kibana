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

export const registerBulkDeleteRoute = (router: IRouter) => {
  router.post(
    {
      path: `${KBN_CLIENT_API_PREFIX}/_bulk_delete`,
      options: {
        tags: ['access:ftrApis'],
      },
      validate: {
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.string(),
          })
        ),
      },
    },
    catchAndReturnBoomErrors(async (ctx, req, res) => {
      const { savedObjects } = await ctx.core;
      const hiddenTypes = listHiddenTypes(savedObjects.typeRegistry);
      const soClient = savedObjects.getClient({ includedHiddenTypes: hiddenTypes });

      const statuses = await soClient.bulkDelete(req.body, { force: true });
      return res.ok({ body: statuses });
    })
  );
};
