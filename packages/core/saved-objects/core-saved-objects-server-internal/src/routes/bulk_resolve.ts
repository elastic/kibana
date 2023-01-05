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
import { catchAndReturnBoomErrors, throwOnHttpHiddenTypes } from './utils';

interface RouteDependencies {
  coreUsageData: InternalCoreUsageDataSetup;
}

export const registerBulkResolveRoute = (
  router: InternalSavedObjectRouter,
  { coreUsageData }: RouteDependencies
) => {
  router.post(
    {
      path: '/_bulk_resolve',
      validate: {
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.string(),
          })
        ),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsBulkResolve({ request: req }).catch(() => {});

      const { savedObjects } = await context.core;
      const typesToThrowOn = [...new Set(req.body.map(({ type }) => type))].filter((tname) => {
        const fullType = savedObjects.typeRegistry.getType(tname);
        if (!fullType?.hidden && fullType?.hiddenFromHttpApis) {
          return fullType.name;
        }
      });
      if (typesToThrowOn.length > 0) {
        throwOnHttpHiddenTypes(typesToThrowOn);
      }
      const result = await savedObjects.client.bulkResolve(req.body);
      return res.ok({ body: result });
    })
  );
};
