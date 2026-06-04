/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodeIdSchema } from '@kbn/as-code-shared-schemas';
import { schema } from '@kbn/config-schema';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core/server';

import { LINKS_API_PATH, PUBLIC_API_VERSION } from '../../../common/constants';
import { commonRouteConfig } from '../constants';
import { updateRequestBodySchema, updateResponseBodySchema } from './schemas';
import { update } from './update';
import { updateLinksOASOperationObject } from '../oas_examples';

export const LINKS_UPDATE_DESCRIPTION =
  `Replaces the full state of a links library item. Partial updates are not supported.
To make incremental changes, retrieve the item first, modify the fields you need, then send the complete object back.

If no item exists with the specified ID, a new one is created.` as const;

export function registerUpdateRoute(router: VersionedRouter<RequestHandlerContext>) {
  const updateRoute = router.put({
    path: `${LINKS_API_PATH}/{id}`,
    summary: `Upsert links library item`,
    ...commonRouteConfig,
    description: LINKS_UPDATE_DESCRIPTION,
  });

  updateRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      options: {
        oasOperationObject: () => updateLinksOASOperationObject,
      },
      validate: {
        request: {
          params: schema.object({
            id: asCodeIdSchema,
          }),
          body: updateRequestBodySchema,
        },
        response: {
          200: {
            body: () => updateResponseBodySchema,
            description: 'updated',
          },
          201: {
            body: () => updateResponseBodySchema,
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
        const result = await update(ctx, req.params.id, req.body);
        return result.meta.created_at === result.meta.updated_at
          ? res.created({ body: result })
          : res.ok({ body: result });
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden({ body: { message: e.message } });
        }
        return res.badRequest({ body: { message: e.message } });
      }
    }
  );
}
