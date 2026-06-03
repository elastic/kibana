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
import { commonRouteConfig } from '../constants';
import { readResponseBodySchema } from './schemas';
import { read } from './read';
import { LINKS_API_PATH, PUBLIC_API_VERSION } from '../../../common/constants';

export function registerReadRoute(router: VersionedRouter<RequestHandlerContext>) {
  const readRoute = router.get({
    path: `${LINKS_API_PATH}/{id}`,
    summary: `Get a links library item by ID`,
    ...commonRouteConfig,
    description: 'Returns the complete state of a links library item by ID.',
  });

  readRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            id: schema.string({
              meta: {
                description:
                  'The links library item ID, as returned by the create or search endpoints.',
              },
            }),
          }),
        },
        response: {
          200: {
            body: () => readResponseBodySchema,
            description: 'success',
          },
          403: {
            description: 'forbidden',
          },
          404: {
            description: 'not found',
          },
        },
      },
    },
    async (ctx, req, res) => {
      try {
        const result = await read(ctx, req.params.id);
        return res.ok({
          body: result,
        });
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 404) {
          return res.notFound({
            body: {
              message: `A links library item with ID ${req.params.id} was not found.`,
            },
          });
        }
        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden({ body: { message: e.message } });
        }
        return res.badRequest({ body: { message: e.message } });
      }
    }
  );
}
