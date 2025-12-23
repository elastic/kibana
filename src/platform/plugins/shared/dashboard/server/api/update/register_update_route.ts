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
import { INTERNAL_API_VERSION, commonRouteConfig } from '../constants';
import { getUpdateRequestBodySchema, getUpdateResponseBodySchema } from './schemas';
import { update } from './update';
import { allowUnmappedKeysSchema } from '../dashboard_state_schemas';
import { throwOnUnmappedKeys } from '../scope_tooling';
import { DASHBOARD_API_PATH } from '../../../common/constants';

export function registerUpdateRoute(router: VersionedRouter<RequestHandlerContext>) {
  const updateRoute = router.put({
    path: `${DASHBOARD_API_PATH}/{id}`,
    summary: `Replace current dashboard state with the dashboard state from request body.`,
    ...commonRouteConfig,
  });

  updateRoute.addVersion(
    {
      version: INTERNAL_API_VERSION,
      validate: () => ({
        request: {
          params: schema.object({
            id: schema.string({
              meta: { description: 'A unique identifier for the dashboard.' },
            }),
          }),
          query: schema.maybe(
            schema.object({
              allowUnmappedKeys: schema.maybe(allowUnmappedKeysSchema),
            })
          ),
          body: getUpdateRequestBodySchema(),
        },
        response: {
          200: {
            body: getUpdateResponseBodySchema,
          },
        },
      }),
    },
    async (ctx, req, res) => {
      try {
        const allowUnmappedKeys = req.query?.allowUnmappedKeys ?? false;
        if (!allowUnmappedKeys) throwOnUnmappedKeys(req.body.data);

        const result = await update(ctx, req.params.id, req.body);
        return res.ok({ body: result });
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 404) {
          return res.notFound({
            body: {
              message: `A dashboard with ID ${req.params.id} was not found.`,
            },
          });
        }
        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden();
        }
        return res.badRequest({ body: e.output.payload });
      }
    }
  );
}
