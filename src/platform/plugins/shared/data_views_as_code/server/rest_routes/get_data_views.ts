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

const GET_DATA_VIEWS_AS_CODE_PATH = BASE_PATH;

export const registerGetDataViewsAsCodeRoute = ({
  router,
  getStartServices,
  ...args
}: RegisterRouteArgs) =>
  router.versioned
    .get({
      path: GET_DATA_VIEWS_AS_CODE_PATH,
      access: 'internal',
      enableQueryVersion: true,
      description: 'Get all data views paginated',
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
        validate: {
          request: {
            query: asCodePaginationParamsSchema.extend({
              query: z.string().optional().meta({
                description:
                  'Filters results by `title` and `description` using Elasticsearch [`simple_query_string`](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-simple-query-string-query) syntax. Multi-word terms require all words to match.',
              }),
            }),
          },
          response: {
            200: {
              body: () => asCodePaginatedResponseSchema,
            },
            400: {
              description: 'bad request',
            },
            403: {
              description: 'forbidden',
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
