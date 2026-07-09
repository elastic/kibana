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

import { PUBLIC_API_VERSION, commonRouteConfig } from '../constants';
import { deleteMarkdown } from './delete';
import { MARKDOWN_API_PATH } from '../../../common/constants';
import { deleteMarkdownOASOperationObject } from '../oas_examples';

export function registerDeleteRoute(
  router: VersionedRouter<RequestHandlerContext>,
  usageCounter: UsageCounter | undefined,
  logger: Logger
) {
  const deleteRoute = router.delete({
    path: `${MARKDOWN_API_PATH}/{id}`,
    summary: `Delete a markdown library item.`,
    ...commonRouteConfig,
    description: 'Permanently deletes a markdown library item by ID.',
  });

  deleteRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      options: {
        oasOperationObject: () => deleteMarkdownOASOperationObject,
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
          204: {
            description: 'deleted',
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
          await deleteMarkdown(ctx, req.params.id);
        } catch (e) {
          if (e.isBoom && e.output.statusCode === 404) {
            const message = `A markdown library item with ID [${req.params.id}] was not found.`;
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

        return res.noContent();
      })
  );
}
