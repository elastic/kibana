/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { asCodeResponseSchema } from './schema';
import { getDataViewsAsCodeService, requestHandler } from './utils';
import { BASE_PATH, INITIAL_REST_VERSION } from './constants';

import type { RegisterRouteArgs } from './types';

const GET_DATA_VIEW_AS_CODE_PATH = BASE_PATH + '/{id}';

export const registerGetDataViewAsCodeRoute = ({
  router,
  getStartServices,
  ...args
}: RegisterRouteArgs) =>
  router.versioned
    .get({
      path: GET_DATA_VIEW_AS_CODE_PATH,
      access: 'public',
      enableQueryVersion: true,
      summary: 'Get a data view',
      description: 'Returns a data view by ID, including its field settings and runtime fields.',
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
            (await import('./oas_examples')).getDataViewOASOperationObject,
        },
        validate: {
          request: {
            params: schema.object(
              {
                id: schema.string({
                  minLength: 1,
                  maxLength: 1_000,
                  meta: {
                    description: 'The ID of the data view to return.',
                  },
                }),
              },
              { unknowns: 'allow' }
            ),
          },
          response: {
            200: {
              body: () => asCodeResponseSchema,
              description: 'OK',
            },
            404: {
              description: 'not found',
            },
          },
        },
      },
      requestHandler(args, async (ctx, req, res) => {
        const id = req.params.id;

        const dataViewsAsCodeService = await getDataViewsAsCodeService(ctx, getStartServices, req);
        const response = await dataViewsAsCodeService.get(id);

        return res.ok({ body: response });
      })
    );
