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
import { SERVICE_KEY, SERVICE_PATH } from '../constants';

interface GetDataViewsArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  counterName: string;
}

export const getDataViews = async ({
  dataViewsService,
  usageCollection,
  counterName,
}: GetDataViewsArgs) => {
  usageCollection?.incrementCounter({ counterName });
  return dataViewsService.getIdsWithTitle();
};

const getDataViewsRouteFactory =
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

          const dataViews = await getDataViews({
            dataViewsService,
            usageCollection,
            counterName: `${req.route.method} ${path}`,
          });

          return res.ok({
            headers: {
              'content-type': 'application/json',
            },
            body: {
              [serviceKey]: dataViews,
            },
          });
        })
      )
    );
  };

export const registerGetDataViewsRoute = getDataViewsRouteFactory(SERVICE_PATH, SERVICE_KEY);
