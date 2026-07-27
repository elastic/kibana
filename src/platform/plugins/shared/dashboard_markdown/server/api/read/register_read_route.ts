/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import { logRequest } from '@kbn/as-code-utils';
import { schema } from '@kbn/config-schema';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { Logger, RequestHandlerContext } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

import { commonRouteConfig, PUBLIC_API_VERSION } from '../constants';
import { readResponseBodySchema } from './schemas';
import { read } from './read';
import { MARKDOWN_API_PATH } from '../../../common/constants';
import { readMarkdownOASOperationObject } from '../oas_examples';

export function registerReadRoute(
  router: VersionedRouter<RequestHandlerContext>,
  usageCounter: UsageCounter | undefined,
  logger: Logger
) {
  const readRoute = router.get({
    path: `${MARKDOWN_API_PATH}/{id}`,
    summary: `Get a markdown library item by ID`,
    ...commonRouteConfig,
    description: 'Returns the complete state of a markdown library item by ID.',
  });

  readRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      options: {
        oasOperationObject: () => readMarkdownOASOperationObject,
      },
      validate: {
        request: {
          params: schema.object({
            id: schema.string({
              meta: {
                description:
                  'The markdown library item ID, as returned by the create or search endpoints.',
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
    async (ctx, req, res) =>
      telemetryHandler(req, usageCounter, async () => {
        try {
          const result = await read(ctx, req.params.id);
          return res.ok({
            body: result,
          });
        } catch (e) {
          if (e.isBoom && e.output.statusCode === 404) {
            const message = `A markdown library item with ID ${req.params.id} was not found.`;
            logRequest(logger, req, 'debug', message);
            return res.notFound({
              body: {
                message,
              },
            });
          }
          if (e.isBoom && e.output.statusCode === 403) {
            logRequest(logger, req, 'debug', e.message);
            return res.forbidden({ body: { message: e.message } });
          }
          const message = e.stack ?? e.message;
          logRequest(logger, req, 'error', message);
          throw e;
        }
      })
  );
}
