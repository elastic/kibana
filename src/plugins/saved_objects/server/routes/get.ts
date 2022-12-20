/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';

export const registerGetRoute = (
  router: IRouter,
) => {
  router.get(
    {
      path: '/api/kibana/saved_objects/get',
      validate: {
        query: schema.object({
          id: schema.string(),
          type: schema.string(),
          version: schema.string(),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { query } = req;
      const client = (await context.core).savedObjects.getClient();

      // in the future we'll pass required saved object verison in here
      const findResponse = await client.resolve<any>(query.type, query.id);

      return res.ok({
        body: {
          ...findResponse,
        },
      });
    })
  );
};
