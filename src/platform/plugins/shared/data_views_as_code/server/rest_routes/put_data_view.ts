/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { asCodeResponseSchema, savedDataViewSpecSchemaWithoutId } from './schema';
import { getDataViewsAsCodeService, requestHandler } from './utils';
import { BASE_PATH, INITIAL_REST_VERSION } from './constants';
import type { RegisterRouteArgs } from './types';

const UPDATE_DATA_VIEW_AS_CODE_PATH = BASE_PATH + '/{id}';

export const registerPutDataViewAsCodeRoute = ({
  router,
  getStartServices,
  ...args
}: RegisterRouteArgs) =>
  router.versioned
    .put({
      path: UPDATE_DATA_VIEW_AS_CODE_PATH,
      access: 'public',
      enableQueryVersion: true,
      summary: 'Upsert a data view',
      description:
        'Creates the data view with the ID in the path, or replaces its definition if it already exists. Returns `201` when the request creates a data view and `200` when it replaces one. A replacement removes any optional property you omit, such as `time_field`.',
      options: {
        tags: ['oas-tag:data-views-v2'],
        availability: {
          stability: 'stable',
          since: '9.6.0',
        },
      },
      security: {
        authz: {
          requiredPrivileges: ['indexPatterns:manage'],
        },
      },
    })
    .addVersion(
      {
        version: INITIAL_REST_VERSION,
        options: {
          oasOperationObject: async () =>
            (await import('./oas_examples')).putDataViewOASOperationObject,
        },
        validate: {
          request: {
            params: schema.object(
              {
                id: schema.string({
                  minLength: 1,
                  maxLength: 1_000,
                  meta: {
                    description: 'The ID of the data view to create or update.',
                  },
                }),
              },
              { unknowns: 'allow' }
            ),
            body: savedDataViewSpecSchemaWithoutId,
          },
          response: {
            200: {
              body: () => asCodeResponseSchema,
              description: 'updated',
            },
            201: {
              body: () => asCodeResponseSchema,
              description: 'created',
            },
            400: {
              description: 'invalid request',
            },
            403: {
              description: 'forbidden',
            },
            409: {
              description: 'conflict',
            },
          },
        },
      },
      requestHandler(args, async (ctx, req, res) => {
        const id = req.params.id;
        const dataViewsAsCodeService = await getDataViewsAsCodeService(ctx, getStartServices, req);
        const response = await dataViewsAsCodeService.upsert(id, req.body);

        return response.action === 'created'
          ? res.created({ body: response.body })
          : res.ok({ body: response.body });
      })
    );
