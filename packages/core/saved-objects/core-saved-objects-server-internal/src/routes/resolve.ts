/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { InternalSavedObjectRouter } from '../internal_types';
import { throwIfTypeNotVisibleByAPI } from './utils';

interface RouteDependencies {
  coreUsageData: InternalCoreUsageDataSetup;
}

export const registerResolveRoute = (
  router: InternalSavedObjectRouter,
  { coreUsageData }: RouteDependencies
) => {
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

      throwIfTypeNotVisibleByAPI(type, savedObjects.typeRegistry);

      const result = await savedObjects.client.resolve(type, id);
      return res.ok({ body: result });
    })
  );
};
