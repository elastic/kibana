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
import { readResponseBodySchema } from './schemas';
import { read } from './read';
import { MARKDOWN_API_PATH } from '../../../common/constants';

export function registerReadRoute(router: VersionedRouter<RequestHandlerContext>) {
  const readRoute = router.get({
    path: `${MARKDOWN_API_PATH}/{id}`,
    summary: `Get a markdown panel by ID`,
    ...commonRouteConfig,
  });

  readRoute.addVersion(
    {
      version: INTERNAL_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            id: schema.string({
              meta: {
                description: 'A unique identifier for the markdown panel.',
              },
            }),
          }),
        },
        response: {
          200: {
            body: () => readResponseBodySchema,
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
              message: `A markdown panel with ID ${req.params.id} was not found.`,
            },
          });
        }

        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden();
        }

        return res.badRequest({ body: e.message });
      }
    }
  );
}
