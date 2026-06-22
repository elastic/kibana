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
import { asCodeResponseSchema, savedDataViewSpecSchemaWithoutId } from './schema';
import { getDataViewsAsCodeService, handleErrors } from './utils';
import { BASE_PATH, INITIAL_REST_VERSION } from './constants';
import type { DataViewsAsCodeServerPluginStartDependencies } from '../types';

const UPDATE_DATA_VIEW_AS_CODE_PATH = BASE_PATH + '/{id}';

export const registerPutDataViewAsCodeRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<DataViewsAsCodeServerPluginStartDependencies, void>
) =>
  router.versioned
    .put({
      path: UPDATE_DATA_VIEW_AS_CODE_PATH,
      access: 'public',
      description: 'Update a data view by id',
      security: {
        authz: {
          requiredPrivileges: ['indexPatterns:manage'],
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
            body: savedDataViewSpecSchemaWithoutId,
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
        const response = await dataViewsAsCodeService.upsert(id, req.body);

        return response.action === 'created'
          ? res.created({ body: response.body })
          : res.ok({ body: response.body });
      })
    );
