/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';
import { CoreUsageDataSetup } from '../../core_usage_data';

interface RouteDependencies {
  coreUsageData: CoreUsageDataSetup;
}

export const registerBulkUpdateRoute = (router: IRouter, { coreUsageData }: RouteDependencies) => {
  router.put(
    {
      path: '/_bulk_update',
      validate: {
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.string(),
            attributes: schema.recordOf(schema.string(), schema.any()),
            version: schema.maybe(schema.string()),
            references: schema.maybe(
              schema.arrayOf(
                schema.object({
                  name: schema.string(),
                  type: schema.string(),
                  id: schema.string(),
                })
              )
            ),
            namespace: schema.maybe(schema.string({ minLength: 1 })),
          })
        ),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsBulkUpdate({ request: req }).catch(() => {});

      const savedObject = await context.core.savedObjects.client.bulkUpdate(req.body);
      return res.ok({ body: savedObject });
    })
  );
};
