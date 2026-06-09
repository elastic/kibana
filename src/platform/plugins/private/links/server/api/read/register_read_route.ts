/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_ID_LENGTH } from '@kbn/as-code-shared-schemas';
import { schema } from '@kbn/config-schema';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core/server';
import { LINKS_API_PATH, PUBLIC_API_VERSION } from '../../../common/constants';
import { commonRouteConfig, LINKS_ID_DESCRIPTION } from '../constants';
import { readLinksOASOperationObject } from '../oas_examples';
import { read } from './read';
import { readResponseBodySchema } from './schemas';

export const LINKS_READ_DESCRIPTION =
  'Returns the complete state of a links library item by ID.' as const;

export function registerReadRoute(router: VersionedRouter<RequestHandlerContext>) {
  const readRoute = router.get({
    path: `${LINKS_API_PATH}/{id}`,
    summary: `Get a links library item by ID`,
    ...commonRouteConfig,
    description: LINKS_READ_DESCRIPTION,
  });

  readRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      options: {
        oasOperationObject: () => readLinksOASOperationObject,
      },
      validate: {
        request: {
          params: schema.object({
            id: schema.string({
              maxLength: MAX_ID_LENGTH,
              meta: {
                description: LINKS_ID_DESCRIPTION,
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
