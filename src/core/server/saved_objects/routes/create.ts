/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';
import { CoreUsageDataSetup } from '../../core_usage_data';

interface RouteDependencies {
  coreUsageData: CoreUsageDataSetup;
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
    router.handleLegacyErrors(async (context, req, res) => {
      const { type, id } = req.params;
      const { overwrite } = req.query;
      const { attributes, migrationVersion, references, initialNamespaces } = req.body;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsCreate({ request: req }).catch(() => {});

      const options = { id, overwrite, migrationVersion, references, initialNamespaces };
      const result = await context.core.savedObjects.client.create(type, attributes, options);
      return res.ok({ body: result });
    })
  );
};
