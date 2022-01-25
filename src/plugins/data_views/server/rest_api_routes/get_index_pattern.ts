/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCounter } from 'src/plugins/usage_collection/server';
import { schema } from '@kbn/config-schema';
import { DataViewsService } from 'src/plugins/data_views/common';
import { handleErrors } from './util/handle_errors';
import { IRouter, StartServicesAccessor } from '../../../../core/server';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../types';
import {
  SPECIFIC_DATA_VIEW_PATH,
  SPECIFIC_DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
} from '../constants';

interface GetDataViewArgs {
  indexPatternsService: DataViewsService;
  usageCollection?: UsageCounter;
  path: string;
  id: string;
}

export const getDataView = async ({
  indexPatternsService,
  usageCollection,
  path,
  id,
}: GetDataViewArgs) => {
  usageCollection?.incrementCounter({ counterName: `GET ${path}` });
  return indexPatternsService.get(id);
};

const getDataViewRouteFactory =
  (path: string, serviceKey: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    router.get(
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

          const dataView = await getDataView({
            indexPatternsService,
            usageCollection,
            path,
            id,
          });

          return res.ok({
            headers: {
              'content-type': 'application/json',
            },
            body: {
              [serviceKey]: dataView.toSpec(),
            },
          });
        })
      )
    );
  };

export const registerGetDataViewRoute = getDataViewRouteFactory(
  SPECIFIC_DATA_VIEW_PATH,
  SERVICE_KEY
);

export const registerGetDataViewRouteLegacy = getDataViewRouteFactory(
  SPECIFIC_DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY_LEGACY
);
