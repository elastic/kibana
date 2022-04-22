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
import { catchAndReturnBoomErrors } from './utils';

interface RouteDependencies {
  coreUsageData: InternalCoreUsageDataSetup;
}

export const registerCreateRoute = (router: IRouter, { coreUsageData }: RouteDependencies) => {
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
