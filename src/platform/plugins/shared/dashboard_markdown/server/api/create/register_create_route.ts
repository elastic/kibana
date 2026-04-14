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

import { commonRouteConfig, INTERNAL_API_VERSION } from '../constants';
import { createRequestBodySchema, createResponseBodySchema } from './schemas';
import { create } from './create';
import { MARKDOWN_API_PATH } from '../../../common/constants';

export function registerCreateRoute(router: VersionedRouter<RequestHandlerContext>) {
  const createRoute = router.post({
    path: MARKDOWN_API_PATH,
    summary: 'Create a markdown library item',
    ...commonRouteConfig,
  });

  createRoute.addVersion(
    {
      version: INTERNAL_API_VERSION,
      validate: {
        request: {
          body: createRequestBodySchema,
        },
        response: {
          201: {
            body: () => createResponseBodySchema,
            description: 'created',
          },
          400: {
            description: 'invalid request',
          },
          403: {
            description: 'forbidden',
          },
        },
      },
    },
    async (ctx, req, res) => {
      try {
        const result = await create(ctx, req.body);
        return res.created({ body: result });
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden({ body: { message: e.message } });
        }

        return res.badRequest({ body: { message: e.message } });
      }
    }
  );
}
