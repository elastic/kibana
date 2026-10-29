/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodePaginationParamsSchema } from '@kbn/as-code-shared-schemas';
import { z } from '@kbn/zod';
import { asCodePaginatedResponseSchema } from './schema';
import { getDataViewsAsCodeService, requestHandler } from './utils';
import { BASE_PATH, INITIAL_REST_VERSION } from './constants';

import type { RegisterRouteArgs } from './types';

export const registerGetDataViewsAsCodeRoute = ({
  router,
  getStartServices,
  ...args
}: RegisterRouteArgs) =>
  router.versioned
    .get({
      path: BASE_PATH,
      access: 'public',
      enableQueryVersion: true,
      summary: 'Search data views',
      description:
        'Returns a paginated list of the data views in the current space. Each item includes only the name, index pattern, and time field. To get the full definition, use `GET /api/data_views/v2/{id}`.',
      options: {
        tags: ['oas-tag:data-views-v2'],
        availability: {
          stability: 'stable',
          since: '9.6.0',
        },
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization provided by saved objects client',
        },
      },
    })
    .addVersion(
      {
        version: INITIAL_REST_VERSION,
        options: {
          oasOperationObject: async () =>
            (await import('./oas_examples')).getDataViewsOASOperationObject,
        },
        validate: {
          request: {
            query: asCodePaginationParamsSchema.extend({
              query: z.string().optional().meta({
                description:
                  'Filters results by `name` and `index_pattern` using Elasticsearch [`simple_query_string`](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-simple-query-string-query) syntax.',
              }),
            }),
          },
          response: {
            200: {
              body: () => asCodePaginatedResponseSchema,
              description: 'OK',
            },
            400: {
              description: 'bad request',
            },
          },
        },
      },
      requestHandler(args, async (ctx, req, res) => {
        const dataViewsAsCodeService = await getDataViewsAsCodeService(ctx, getStartServices, req);
        const { page, per_page: perPage, query: search } = req.query;
        const response = await dataViewsAsCodeService.search({ page, perPage, search });

        return res.ok({ body: response });
      })
    );
