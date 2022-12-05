/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-utils-server';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { InternalSavedObjectRouter } from '../internal_types';

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

      // Only implement blocking behavior for visible types.
      // Hidden types are taken care of in the repository
      // Assumes hiddenFromHttpApis can only be configured for visible types (hidden:false)
      const { typeRegistry } = (await context.core).savedObjects;
      if (typeRegistry.isHiddenFromHttpApis(type)) {
        throw SavedObjectsErrorHelpers.createUnsupportedTypeError(type); // visible type is not exposed to the HTTP API
      }

      const result = await savedObjects.client.resolve(type, id);
      return res.ok({ body: result });
    })
  );
};
