/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';

import { asCodeSearchRequestSchema } from '@kbn/as-code-shared-schemas';
import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import { logRequest } from '@kbn/as-code-utils';
import { schema } from '@kbn/config-schema';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { Logger, RequestHandlerContext } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

import { MARKDOWN_API_PATH } from '../../../common/constants';
import { commonRouteConfig, PUBLIC_API_VERSION } from '../constants';
import { searchMarkdownOASOperationObject } from '../oas_examples';
import { searchResponseBodySchema } from './schemas';
import { search } from './search';

export function registerSearchRoute(
  router: VersionedRouter<RequestHandlerContext>,
  usageCounter: UsageCounter | undefined,
  logger: Logger
) {
  const searchRoute = router.get({
    path: MARKDOWN_API_PATH,
    summary: `List markdown library items`,
    ...commonRouteConfig,
    description:
      'Returns a paginated list of markdown library items. Each result includes title, description, and metadata, but not the content. Use `GET /api/markdowns/{id}` to retrieve the complete state.',
  });

  searchRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      options: {
        oasOperationObject: () => searchMarkdownOASOperationObject,
      },
      validate: {
        request: {
          query: schema.object({
            ...omit(asCodeSearchRequestSchema.getPropSchemas(), ['tags', 'excluded_tags']),
          }),
        },
        response: {
          200: {
            body: () => searchResponseBodySchema,
            description: 'success',
          },
          403: {
            description: 'forbidden',
          },
        },
      },
    },
    async (ctx, req, res) =>
      telemetryHandler(req, usageCounter, async () => {
        let result;
        try {
          result = await search(ctx, req.query);
        } catch (e) {
          if (e.isBoom && e.output.statusCode === 403) {
            logRequest(logger, req, 'debug', e.message);
            return res.forbidden({ body: { message: e.message } });
          }
          const message = e.stack ?? e.message;
          logRequest(logger, req, 'error', message);
          throw e;
        }
        return res.ok({ body: result });
      })
  );
}
