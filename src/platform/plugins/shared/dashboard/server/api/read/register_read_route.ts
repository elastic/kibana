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
import { getReadResponseBodySchema } from './schemas';
import { read } from './read';
import { allowUnmappedKeysSchema } from '../dashboard_state_schemas';
import { stripUnmappedKeys } from '../scope_tooling';
import { DASHBOARD_API_PATH } from '../../../common/constants';

export function registerReadRoute(router: VersionedRouter<RequestHandlerContext>) {
  const readRoute = router.get({
    path: `${DASHBOARD_API_PATH}/{id}`,
    summary: `Get a dashboard`,
    ...commonRouteConfig,
  });

  readRoute.addVersion(
    {
      version: INTERNAL_API_VERSION,
      validate: () => ({
        request: {
          params: schema.object({
            id: schema.string({
              meta: {
                description: 'A unique identifier for the dashboard.',
              },
            }),
          }),
          query: schema.maybe(
            schema.object({
              allowUnmappedKeys: schema.maybe(allowUnmappedKeysSchema),
            })
          ),
        },
        response: {
          200: {
            body: getReadResponseBodySchema,
          },
        },
      }),
    },
    async (ctx, req, res) => {
      try {
        const result = await read(ctx, req.params.id);
        const allowUnmappedKeys = req.query?.allowUnmappedKeys ?? false;
        const { data, warnings } = !allowUnmappedKeys
          ? stripUnmappedKeys(result.data)
          : { data: result.data, warnings: [] };
        return res.ok({
          body: {
            ...result,
            data,
            ...(warnings?.length && { warnings }),
          },
        });
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 404) {
          return res.notFound({
            body: {
              message: `A dashboard with ID ${req.params.id}] was not found.`,
            },
          });
        }

        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden();
        }

        return res.badRequest(e.message);
      }
    }
  );
}
