/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';
import { InternalCoreUsageDataSetup } from '../../core_usage_data';

interface RouteDependencies {
  coreUsageData: InternalCoreUsageDataSetup;
}

export const registerResolveRoute = (router: IRouter, { coreUsageData }: RouteDependencies) => {
  router.get(
    {
      path: '/resolve/{type}/{id}',
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { type, id } = req.params;
      const { savedObjects } = await context.core;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsResolve({ request: req }).catch(() => {});

      const result = await savedObjects.client.resolve(type, id);
      return res.ok({ body: result });
    })
  );
};
