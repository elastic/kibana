/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsUpdateOptions } from '@kbn/core-saved-objects-api-server';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-utils-server';
import type { InternalSavedObjectRouter } from '../internal_types';
import { catchAndReturnBoomErrors } from './utils';

interface RouteDependencies {
  coreUsageData: InternalCoreUsageDataSetup;
}

export const registerUpdateRoute = (
  router: InternalSavedObjectRouter,
  { coreUsageData }: RouteDependencies
) => {
  router.put(
    {
      path: '/{type}/{id}',
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
        body: schema.object({
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
          upsert: schema.maybe(schema.recordOf(schema.string(), schema.any())),
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      const { type, id } = req.params;
      const { attributes, version, references, upsert } = req.body;
      const options: SavedObjectsUpdateOptions = { version, references, upsert };

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsUpdate({ request: req }).catch(() => {});

      // Only implement blocking behavior for visible types.
      // Hidden types are taken care of in the repository
      // Assumes hiddenFromHttpApis can only be configured for visible types (hidden:false)
      const { typeRegistry } = (await context.core).savedObjects;
      if (typeRegistry.isHiddenFromHttpApis(type)) {
        throw SavedObjectsErrorHelpers.createUnsupportedTypeError(type); // visible type is not exposed to the HTTP API
      }

      const { savedObjects } = await context.core;
      const result = await savedObjects.client.update(type, id, attributes, options);
      return res.ok({ body: result });
    })
  );
};
