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

export const registerDeleteRoute = (router: IRouter, { coreUsageData }: RouteDependencies) => {
  router.delete(
    {
      path: '/{type}/{id}',
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
        query: schema.object({
          force: schema.maybe(schema.boolean()),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { type, id } = req.params;
      const { force } = req.query;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsDelete({ request: req }).catch(() => {});

      const result = await context.core.savedObjects.client.delete(type, id, { force });
      return res.ok({ body: result });
    })
  );
};
