/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';
import { CoreUsageDataSetup } from '../../core_usage_data';
import type { SavedObjectsUpdateOptions } from '../service/saved_objects_client';
import { catchAndReturnBoomErrors } from './utils';

interface RouteDependencies {
  coreUsageData: CoreUsageDataSetup;
}

export const registerUpdateRoute = (router: IRouter, { coreUsageData }: RouteDependencies) => {
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

      const result = await context.core.savedObjects.client.update(type, id, attributes, options);
      return res.ok({ body: result });
    })
  );
};
