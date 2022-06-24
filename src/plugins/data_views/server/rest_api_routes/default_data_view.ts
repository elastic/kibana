/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { schema } from '@kbn/config-schema';
import { IRouter, StartServicesAccessor, SavedObjectsClientContract } from '@kbn/core/server';
import { DataViewsServiceServer } from '..';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../types';
import { handleErrors } from './util/handle_errors';
import { SERVICE_PATH, SERVICE_PATH_LEGACY, SERVICE_KEY, SERVICE_KEY_LEGACY } from '../constants';

interface GetDefaultArgs {
  dataViewsService: DataViewsServiceServer;
  usageCollection?: UsageCounter;
  counterName: string;
  provideDefault: boolean;
}

export const getDefault = async ({
  dataViewsService,
  usageCollection,
  counterName,
  provideDefault,
}: GetDefaultArgs) => {
  usageCollection?.incrementCounter({ counterName });

  if (!provideDefault) {
    return dataViewsService.getDefaultId();
  }
  const dataView = await dataViewsService.getDefaultDataView();
  return dataView?.id;
};

interface SetDefaultArgs {
  dataViewsService: DataViewsServiceServer;
  usageCollection?: UsageCounter;
  counterName: string;
  newDefaultId: string;
  force: boolean;
}

export const setDefault = async ({
  dataViewsService,
  usageCollection,
  counterName,
  newDefaultId,
  force,
}: SetDefaultArgs) => {
  usageCollection?.incrementCounter({ counterName });
  return dataViewsService.setDefault(newDefaultId, force);
};

const manageDefaultIndexPatternRoutesFactory =
  (path: string, serviceKey: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    router.get<{ provideDefault?: string }, {}, {}>(
      {
        path,
        validate: {},
      },
      handleErrors(async (ctx, req, res) => {
        const [core, , { dataViewsServiceFactory }] = await getStartServices();
        const provideDefault = !!req.url.searchParams.get('provideDefault');
        const savedObjectsClient =
          core.savedObjects.createInternalRepository() as unknown as SavedObjectsClientContract;
        const elasticsearchClient = core.elasticsearch.client.asInternalUser;

        const dataViewsService = await dataViewsServiceFactory(
          savedObjectsClient,
          elasticsearchClient,
          req
        );

        const id = await getDefault({
          dataViewsService,
          usageCollection,
          counterName: `${req.route.method} ${path}`,
          provideDefault,
        });

        return res.ok({
          body: {
            [`${serviceKey}_id`]: id,
          },
        });
      })
    );

    router.post(
      {
        path,
        validate: {
          body: schema.object({
            [`${serviceKey}_id`]: schema.nullable(
              schema.string({
                minLength: 1,
                maxLength: 1_000,
              })
            ),
            force: schema.boolean({ defaultValue: false }),
          }),
        },
      },
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

        const newDefaultId = req.body[`${serviceKey}_id`] as string;
        const force = req.body.force as boolean;

        await setDefault({
          dataViewsService,
          usageCollection,
          counterName: `${req.route.method} ${path}`,
          newDefaultId,
          force,
        });

        return res.ok({
          body: {
            acknowledged: true,
          },
        });
      })
    );
  };

export const registerManageDefaultDataViewRoute = manageDefaultIndexPatternRoutesFactory(
  `${SERVICE_PATH}/default`,
  SERVICE_KEY
);

export const registerManageDefaultDataViewRouteLegacy = manageDefaultIndexPatternRoutesFactory(
  `${SERVICE_PATH_LEGACY}/default`,
  SERVICE_KEY_LEGACY
);
