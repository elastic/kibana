/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { handleErrors } from './util/handle_errors';
import { IRouter, StartServicesAccessor } from '../../../../core/server';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../types';
import { SPECIFIC_DATA_VIEW_PATH, SPECIFIC_DATA_VIEW_PATH_LEGACY } from '../constants';

const deleteIndexPatternRouteFactory =
  (path: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >
  ) => {
    router.delete(
      {
        path,
        validate: {
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
      },
      router.handleLegacyErrors(
        handleErrors(async (ctx, req, res) => {
          const savedObjectsClient = ctx.core.savedObjects.client;
          const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
          const [, , { dataViewsServiceFactory }] = await getStartServices();
          const indexPatternsService = await dataViewsServiceFactory(
            savedObjectsClient,
            elasticsearchClient,
            req
          );
          const id = req.params.id;

          await indexPatternsService.delete(id);

          return res.ok({
            headers: {
              'content-type': 'application/json',
            },
          });
        })
      )
    );
  };

export const registerDeleteDataViewRoute = deleteIndexPatternRouteFactory(SPECIFIC_DATA_VIEW_PATH);

export const registerDeleteDataViewRouteLegacy = deleteIndexPatternRouteFactory(
  SPECIFIC_DATA_VIEW_PATH_LEGACY
);
