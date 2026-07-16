/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import { writeErrorHandler } from '@kbn/as-code-utils';
import { schema } from '@kbn/config-schema';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { Logger, RequestHandlerContext } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

import { PUBLIC_API_VERSION, commonRouteConfig } from '../constants';
import { updateRequestBodySchema, updateResponseBodySchema } from './schemas';
import { update } from './update';
import { MARKDOWN_API_PATH } from '../../../common/constants';
import { updateMarkdownOASOperationObject } from '../oas_examples';

export function registerUpdateRoute(
  router: VersionedRouter<RequestHandlerContext>,
  usageCounter: UsageCounter | undefined,
  logger: Logger
) {
  const updateRoute = router.put({
    path: `${MARKDOWN_API_PATH}/{id}`,
    summary: `Upsert a markdown library item`,
    ...commonRouteConfig,
    description: `Replaces the full state of a markdown library item. Partial updates are not supported.
To make incremental changes, retrieve the item first, modify the fields you need, then send the complete object back.

If no item exists with the specified ID, a new one is created.`,
  });

  updateRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      options: {
        oasOperationObject: () => updateMarkdownOASOperationObject,
      },
      validate: {
        request: {
          params: schema.object({
            // Can not validate id at route level
            // existing markdown panels may have invalid "as code" ids
            id: schema.string({
              meta: {
                description: 'The unique ID of the markdown library item to be created or updated.',
              },
            }),
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
    async (ctx, req, res) =>
      telemetryHandler(req, usageCounter, async () => {
        try {
          const { body, operation } = await update(ctx, req.params.id, req.body);
          if (operation === 'create') {
            return res.created({ body });
          } else {
            return res.ok({ body });
          }
        } catch (e) {
          return writeErrorHandler(e, res, logger, req);
        }
      })
  );
}
