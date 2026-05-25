/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { INITIAL_REST_VERSION, SERVICE_PATH } from '../../../constants';
import {
  type DataViewsServerPluginStart,
  type DataViewsServerPluginStartDependencies,
} from '../../..';
import { handleErrors } from '../util/handle_errors';
import { asCodeResponseSchema } from './schema';
import { getDataViewsAsCodeService } from './utils';

const GET_DATA_VIEW_AS_CODE_PATH = SERVICE_PATH + '/{id}';

export const registerGetDataViewAsCodeRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >
) =>
  router.versioned
    .get({
      path: GET_DATA_VIEW_AS_CODE_PATH,
      access: 'public',
      description: 'Get a data view by id',
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
            params: schema.object(
              {
                id: schema.string({
                  minLength: 1,
                  maxLength: 1_000,
                }),
              },
              { unknowns: 'allow' }
            ),
          },
          response: {
            200: {
              body: () => asCodeResponseSchema,
            },
          },
        },
      },
      handleErrors(async (ctx, req, res) => {
        const id = req.params.id;

        const dataViewsAsCodeService = await getDataViewsAsCodeService(ctx, getStartServices, req);
        const response = await dataViewsAsCodeService.get(id);

        return res.ok({ body: response });
      })
    );
