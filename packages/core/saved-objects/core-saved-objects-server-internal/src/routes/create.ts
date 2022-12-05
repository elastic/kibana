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

export const registerCreateRoute = (
  router: InternalSavedObjectRouter,
  { coreUsageData }: RouteDependencies
) => {
  router.post(
    {
      path: '/{type}/{id?}',
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.maybe(schema.string()),
        }),
        query: schema.object({
          overwrite: schema.boolean({ defaultValue: false }),
        }),
        body: schema.object({
          attributes: schema.recordOf(schema.string(), schema.any()),
          migrationVersion: schema.maybe(schema.recordOf(schema.string(), schema.string())),
          coreMigrationVersion: schema.maybe(schema.string()),
          references: schema.maybe(
            schema.arrayOf(
              schema.object({
                name: schema.string(),
                type: schema.string(),
                id: schema.string(),
              })
            )
          ),
          initialNamespaces: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 })),
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      const { type, id } = req.params;
      const { overwrite } = req.query;
      const { attributes, migrationVersion, coreMigrationVersion, references, initialNamespaces } =
        req.body;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsCreate({ request: req }).catch(() => {});
      // Only implement blocking behavior for visible types.
      // Hidden types are taken care of in the repository
      // Assumes hiddenFromHttpApis can only be configured for visible types (hidden:false)
      const { typeRegistry } = (await context.core).savedObjects;
      if (typeRegistry.isHiddenFromHttpApis(type)) {
        throw SavedObjectsErrorHelpers.createUnsupportedTypeError(type); // visible type is not exposed to the HTTP API
      }

      const options = {
        id,
        overwrite,
        migrationVersion,
        coreMigrationVersion,
        references,
        initialNamespaces,
      };
      const { savedObjects } = await context.core;
      const result = await savedObjects.client.create(type, attributes, options);
      return res.ok({ body: result });
    })
  );
};
