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

export const registerBulkGetRoute = (
  router: InternalSavedObjectRouter,
  { coreUsageData }: RouteDependencies
) => {
  router.post(
    {
      path: '/_bulk_get',
      validate: {
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.string(),
            fields: schema.maybe(schema.arrayOf(schema.string())),
            namespaces: schema.maybe(schema.arrayOf(schema.string())),
          })
        ),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsBulkGet({ request: req }).catch(() => {});

      const { savedObjects } = await context.core;
      // throw if request body contains any types hidden from the HTTP APIs
      const unsupportedTypes = [...new Set(req.body.map(({ type }) => type))].filter((tname) => {
        const fullType = savedObjects.typeRegistry.getType(tname);
        if (!fullType?.hidden && fullType?.hiddenFromHttpApis) {
          return fullType.name;
        }
      });
      if (unsupportedTypes.length > 0) {
        throwOnHttpHiddenTypes(unsupportedTypes);
      }
      const result = await savedObjects.client.bulkGet(req.body);
      return res.ok({ body: result });
    })
  );
};
