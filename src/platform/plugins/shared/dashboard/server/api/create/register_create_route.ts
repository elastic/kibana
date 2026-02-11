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
import { schema } from '@kbn/config-schema';
import { commonRouteConfig, INTERNAL_API_VERSION } from '../constants';
import { getCreateRequestBodySchema, getCreateResponseBodySchema } from './schemas';
import { create } from './create';
import { allowUnmappedKeysSchema } from '../dashboard_state_schemas';
import { throwOnUnmappedKeys } from '../scope_tooling';
import { DASHBOARD_API_PATH } from '../../../common/constants';

export function registerCreateRoute(router: VersionedRouter<RequestHandlerContext>) {
  const createRoute = router.post({
    path: DASHBOARD_API_PATH,
    summary: 'Create a dashboard',
    ...commonRouteConfig,
  });

  createRoute.addVersion(
    {
      version: INTERNAL_API_VERSION,
      validate: () => ({
        request: {
          query: schema.maybe(
            schema.object({
              allowUnmappedKeys: schema.maybe(allowUnmappedKeysSchema),
            })
          ),
          body: getCreateRequestBodySchema(),
        },
        response: {
          200: {
            body: getCreateResponseBodySchema,
          },
        },
      }),
    },
    async (ctx, req, res) => {
      try {
        const allowUnmappedKeys = req.query?.allowUnmappedKeys ?? false;
        if (!allowUnmappedKeys) throwOnUnmappedKeys(req.body.data);

        const result = await create(ctx, req.body);
        return res.ok({ body: result });
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 409) {
          return res.conflict({
            body: {
              message: `A dashboard with ID ${req.body.id} already exists.`,
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
