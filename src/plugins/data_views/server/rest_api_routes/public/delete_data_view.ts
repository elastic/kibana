/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { schema } from '@kbn/config-schema';
import { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { DataViewsService } from '../../../common';
import { handleErrors } from './util/handle_errors';
import type {
  DataViewsServerPluginStartDependencies,
  DataViewsServerPluginStart,
} from '../../types';
import {
  SPECIFIC_DATA_VIEW_PATH,
  SPECIFIC_DATA_VIEW_PATH_LEGACY,
  INITIAL_REST_VERSION,
  DELETE_DATA_VIEW_DESCRIPTION,
} from '../../constants';

interface DeleteDataViewArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  counterName: string;
  id: string;
}

export const deleteDataView = async ({
  dataViewsService,
  usageCollection,
  counterName,
  id,
}: DeleteDataViewArgs) => {
  usageCollection?.incrementCounter({ counterName });
  return dataViewsService.delete(id);
};

const deleteIndexPatternRouteFactory =
  (path: string, description?: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    router.versioned.delete({ path, access: 'public', description }).addVersion(
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
        },
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
          const id = req.params.id;

          await deleteDataView({
            dataViewsService,
            usageCollection,
            counterName: `${req.route.method} ${path}`,
            id,
          });

          return res.ok();
        })
      )
    );
  };

export const registerDeleteDataViewRoute = deleteIndexPatternRouteFactory(
  SPECIFIC_DATA_VIEW_PATH,
  DELETE_DATA_VIEW_DESCRIPTION
);

export const registerDeleteDataViewRouteLegacy = deleteIndexPatternRouteFactory(
  SPECIFIC_DATA_VIEW_PATH_LEGACY
);
