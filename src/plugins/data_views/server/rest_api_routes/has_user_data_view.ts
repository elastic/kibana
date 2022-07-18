/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { DataViewsService } from '../../common';
import { handleErrors } from './util/handle_errors';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../types';
import { SERVICE_PATH, SERVICE_PATH_LEGACY } from '../constants';

interface HasUserDataViewArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  counterName: string;
}

export const hasUserDataView = async ({
  dataViewsService,
  usageCollection,
  counterName,
}: HasUserDataViewArgs) => {
  usageCollection?.incrementCounter({ counterName });
  return dataViewsService.hasUserDataView();
};

const hasUserDataViewRouteFactory =
  (path: string) =>
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
        validate: {},
      },
      router.handleLegacyErrors(
        handleErrors(async (ctx, req, res) => {
          const core = await ctx.core;
          const savedObjectsClient = core.savedObjects.client;
          const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
          const [, , { dataViewsServiceFactory }] = await getStartServices();

          const dataViewsService = await dataViewsServiceFactory(
            savedObjectsClient,
            elasticsearchClient,
            req
          );

          const result = await hasUserDataView({
            dataViewsService,
            usageCollection,
            counterName: `${req.route.method} ${path}`,
          });

          return res.ok({
            body: {
              result,
            },
          });
        })
      )
    );
  };

export const registerHasUserDataViewRoute = hasUserDataViewRouteFactory(
  `${SERVICE_PATH}/has_user_data_view`
);

export const registerHasUserDataViewRouteLegacy = hasUserDataViewRouteFactory(
  `${SERVICE_PATH_LEGACY}/has_user_index_pattern`
);
