/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodeResponseSchema, savedDataViewSpecSchemaWithoutId } from './schema';
import { getDataViewsAsCodeService, requestHandler } from './utils';
import { BASE_PATH, INITIAL_REST_VERSION } from './constants';
import type { RegisterRouteArgs } from './types';

const CREATE_DATA_VIEW_AS_CODE_PATH = BASE_PATH;

export const registerPostDataViewAsCodeRoute = ({
  router,
  getStartServices,
  ...args
}: RegisterRouteArgs) =>
  router.versioned
    .post({
      path: CREATE_DATA_VIEW_AS_CODE_PATH,
      access: 'public',
      enableQueryVersion: true,
      summary: 'Create a data view',
      description:
        'Creates a data view and returns it. Kibana generates the data view ID. If a data view with the same name already exists, the request fails with a conflict.',
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
            (await import('./oas_examples')).postDataViewOASOperationObject,
        },
        validate: {
          request: {
            body: savedDataViewSpecSchemaWithoutId,
          },
          response: {
            201: {
              body: () => asCodeResponseSchema,
              description: 'The data view was created.',
            },
            400: {
              description:
                'The request is invalid, for example when a field format type does not exist.',
            },
            403: {
              description: 'forbidden',
            },
            409: {
              description: 'A data view with the same name already exists.',
            },
          },
        },
      },
      requestHandler(args, async (ctx, req, res) => {
        const dataViewsAsCodeService = await getDataViewsAsCodeService(ctx, getStartServices, req);
        const storedDataView = await dataViewsAsCodeService.create(req.body);

        return res.created({ body: storedDataView });
      })
    );
