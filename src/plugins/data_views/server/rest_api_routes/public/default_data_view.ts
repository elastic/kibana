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
import type {
  DataViewsServerPluginStartDependencies,
  DataViewsServerPluginStart,
} from '../../types';
import { handleErrors } from './util/handle_errors';
import {
  SERVICE_PATH,
  SERVICE_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
  INITIAL_REST_VERSION,
  GET_DEFAULT_DATA_VIEW_DESCRIPTION,
  SET_DEFAULT_DATA_VIEW_DESCRIPTION,
} from '../../constants';

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
  (path: string, serviceKey: string, getDescription?: string, postDescription?: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    router.versioned.get({ path, access: 'public', description: getDescription }).addVersion(
      {
        version: INITIAL_REST_VERSION,
        security: {
          authz: {
            enabled: false,
            reason: 'Authorization provided by saved objects client',
          },
        },
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

    router.versioned.post({ path, access: 'public', description: postDescription }).addVersion(
      {
        version: INITIAL_REST_VERSION,
        security: {
          authz: {
            requiredPrivileges: ['indexPatterns:manage'],
          },
        },
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
  SERVICE_KEY,
  GET_DEFAULT_DATA_VIEW_DESCRIPTION,
  SET_DEFAULT_DATA_VIEW_DESCRIPTION
);

export const registerManageDefaultDataViewRouteLegacy = manageDefaultIndexPatternRoutesFactory(
  `${SERVICE_PATH_LEGACY}/default`,
  SERVICE_KEY_LEGACY
);
