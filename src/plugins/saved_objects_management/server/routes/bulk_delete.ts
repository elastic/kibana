/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';

export const registerBulkDeleteRoute = (router: IRouter) => {
  router.post(
    {
      path: '/internal/kibana/management/saved_objects/_bulk_delete',
      validate: {
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.string(),
          })
        ),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { getClient } = (await context.core).savedObjects;

      const objects = req.body;
      const client = getClient();
      const response = await client.bulkDelete(objects, { force: true });

      return res.ok({ body: response.statuses });
    })
  );
};
