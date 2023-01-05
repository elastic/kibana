/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-utils-server';
import type { InternalSavedObjectRouter } from '../internal_types';
import { catchAndReturnBoomErrors } from './utils';

interface RouteDependencies {
  coreUsageData: InternalCoreUsageDataSetup;
}

export const registerGetRoute = (
  router: InternalSavedObjectRouter,
  { coreUsageData }: RouteDependencies
) => {
  router.get(
    {
      path: '/{type}/{id}',
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      const { type, id } = req.params;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsGet({ request: req }).catch(() => {});

      const { savedObjects } = await context.core;
      const fullType = savedObjects.typeRegistry.getType(type);
      if (!fullType?.hidden && fullType?.hiddenFromHttpApis) {
        throw SavedObjectsErrorHelpers.createUnsupportedTypeError(type);
      }

      const object = await savedObjects.client.get(type, id);
      return res.ok({ body: object });
    })
  );
};
