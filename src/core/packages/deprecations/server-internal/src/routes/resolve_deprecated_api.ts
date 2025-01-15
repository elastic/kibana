/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { InternalDeprecationRouter } from '../internal_types';
import { buildApiDeprecationId } from '../deprecations';

export const registerMarkAsResolvedRoute = (
  router: InternalDeprecationRouter,
  { coreUsageData }: { coreUsageData: InternalCoreUsageDataSetup }
) => {
  router.post(
    {
      path: '/mark_as_resolved',
      options: {
        access: 'internal',
      },
      validate: {
        body: schema.object({
          domainId: schema.string(),
          routePath: schema.string(),
          routeMethod: schema.oneOf([
            schema.literal('post'),
            schema.literal('put'),
            schema.literal('delete'),
            schema.literal('patch'),
            schema.literal('get'),
            schema.literal('options'),
          ]),
          routeVersion: schema.maybe(schema.string()),
          incrementBy: schema.number(),
        }),
      },
    },
    async (_, req, res) => {
      const usageClient = coreUsageData.getClient();
      const { routeMethod, routePath, routeVersion, incrementBy } = req.body;
      const counterName = buildApiDeprecationId({
        routeMethod,
        routePath,
        routeVersion,
      });

      await usageClient.incrementDeprecatedApi(counterName, { resolved: true, incrementBy });
      return res.ok();
    }
  );
};
