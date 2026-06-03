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
import { searchRequestQuerySchema, searchResponseBodySchema } from './schemas';
import { search } from './search';
import { LINKS_API_PATH, PUBLIC_API_VERSION } from '../../../common/constants';
import { commonRouteConfig } from '../constants';

export function registerSearchRoute(router: VersionedRouter<RequestHandlerContext>) {
  const searchRoute = router.get({
    path: LINKS_API_PATH,
    summary: `List links library items`,
    ...commonRouteConfig,
    description: `Returns a paginated list of links library items. Each result includes title, description, and metadata, but not the content. Use \`GET ${LINKS_API_PATH}/{id}\` to retrieve the complete state.`,
  });

  searchRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      validate: {
        request: {
          query: searchRequestQuerySchema,
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
    async (ctx, req, res) => {
      let result;
      try {
        result = await search(ctx, req.query);
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden({ body: { message: e.message } });
        }

        return res.badRequest({ body: { message: e.message } });
      }

      return res.ok({ body: result });
    }
  );
}
