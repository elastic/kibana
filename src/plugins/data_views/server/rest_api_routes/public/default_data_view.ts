/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { DataViewsService } from '../../../common';
import {
  INITIAL_REST_VERSION,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
  SERVICE_PATH,
  SERVICE_PATH_LEGACY,
} from '../../constants';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../types';
import { handleErrors } from './util/handle_errors';

interface GetDefaultArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  counterName: string;
}

export const getDefault = async ({
  dataViewsService,
  usageCollection,
  counterName,
}: GetDefaultArgs) => {
  usageCollection?.incrementCounter({ counterName });
  return dataViewsService.getDefaultId();
};

interface SetDefaultArgs {
  dataViewsService: DataViewsService;
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
    router.versioned.get({ path, access: 'public' }).addVersion(
      {
        version: INITIAL_REST_VERSION,
        validate: {
          request: {},
          response: {
            200: {
              body: () => schema.object({ [`${serviceKey}_id`]: schema.string() }),
            },
          },
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

        const id = await getDefault({
          dataViewsService,
          usageCollection,
          counterName: `${req.route.method} ${path}`,
        });

        return res.ok({
          body: {
            [`${serviceKey}_id`]: id,
          },
        });
      })
    );

    router.versioned.post({ path, access: 'public' }).addVersion(
      {
        version: INITIAL_REST_VERSION,
        validate: {
          request: {
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
          response: {
            200: {
              body: () => schema.object({ acknowledged: schema.boolean() }),
            },
          },
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
