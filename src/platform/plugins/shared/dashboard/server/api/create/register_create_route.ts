/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionedRouter } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core/server';
import { getRouteConfig } from '../get_route_config';
import {
  createRequestParamsSchema,
  getCreateRequestBodySchema,
  getCreateResponseBodySchema,
} from './schemas';
import { create } from './create';

export function registerCreateRoute(
  router: VersionedRouter<RequestHandlerContext>,
  isDashboardAppRequest: boolean
) {
  const { basePath, routeConfig, routeVersion } = getRouteConfig(isDashboardAppRequest);
  const createRoute = router.post({
    path: `${basePath}/{id?}`,
    summary: 'Create a dashboard with an auto-generated ID or a specified ID',
    ...routeConfig,
  });

  createRoute.addVersion(
    {
      version: routeVersion,
      validate: () => ({
        request: {
          params: createRequestParamsSchema,
          body: getCreateRequestBodySchema(isDashboardAppRequest),
        },
        response: {
          200: {
            body: () => getCreateResponseBodySchema(isDashboardAppRequest),
          },
        },
      }),
    },
    async (ctx, req, res) => {
      try {
        const result = await create(ctx, req.body, req.params, isDashboardAppRequest);
        return res.ok({ body: result });
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 409) {
          return res.conflict({
            body: {
              message: `A dashboard with ID ${req?.params?.id} already exists.`,
            },
          });
        }

        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden();
        }

        return res.badRequest({ body: e });
      }
    }
  );
}
