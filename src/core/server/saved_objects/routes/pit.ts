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

const TYPE_DELIMITER = ',';

export const registerPointInTimeRoute = (router: IRouter, { coreUsageData }: RouteDependencies) => {
  router.post(
    {
      path: '/{types}/_pit',
      validate: {
        params: schema.object({
          types: schema.string(),
        }),
        body: schema.nullable(
          schema.object(
            {
              keepAlive: schema.maybe(schema.string()),
              preference: schema.maybe(schema.string()),
            },
            {
              defaultValue: {},
            }
          )
        ),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { types } = req.params;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsOpenPit({ request: req }).catch(() => {});

      const result = await context.core.savedObjects.client.openPointInTimeForType(
        types.split(TYPE_DELIMITER),
        {
          ...(req.body?.keepAlive ? { keepAlive: req.body.keepAlive } : {}),
          ...(req.body?.preference ? { preference: req.body.preference } : {}),
        }
      );
      return res.ok({ body: result });
    })
  );
};
