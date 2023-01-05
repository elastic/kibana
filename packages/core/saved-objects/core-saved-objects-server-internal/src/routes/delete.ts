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
import { catchAndReturnBoomErrors } from './utils';

interface RouteDependencies {
  coreUsageData: InternalCoreUsageDataSetup;
}

export const registerDeleteRoute = (
  router: InternalSavedObjectRouter,
  { coreUsageData }: RouteDependencies
) => {
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
    catchAndReturnBoomErrors(async (context, req, res) => {
      const { type, id } = req.params;
      const { force } = req.query;
      const { getClient, typeRegistry } = (await context.core).savedObjects;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsDelete({ request: req }).catch(() => {});
      const fullType = typeRegistry.getType(type);
      if (!fullType?.hidden && fullType?.hiddenFromHttpApis) {
        throw SavedObjectsErrorHelpers.createUnsupportedTypeError(type);
      }

      const client = getClient();
      const result = await client.delete(type, id, { force });
      return res.ok({ body: result });
    })
  );
};
