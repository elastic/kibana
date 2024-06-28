/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { schema } from '@kbn/config-schema';
import { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { DataViewsService } from '../../../../common/data_views';
import { ErrorIndexPatternFieldNotFound } from '../../../error';
import { handleErrors } from '../util/handle_errors';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../../types';
import {
  SPECIFIC_RUNTIME_FIELD_PATH,
  SPECIFIC_RUNTIME_FIELD_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
  SERVICE_KEY_TYPE,
  INITIAL_REST_VERSION,
  GET_RUNTIME_FIELD_DESCRIPTION,
} from '../../../constants';
import { responseFormatter } from './response_formatter';
import { runtimeResponseSchema } from '../../schema';
import type { RuntimeResponseType } from '../../route_types';

interface GetRuntimeFieldArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  counterName: string;
  id: string;
  name: string;
}

export const getRuntimeField = async ({
  dataViewsService,
  usageCollection,
  counterName,
  id,
  name,
}: GetRuntimeFieldArgs) => {
  usageCollection?.incrementCounter({ counterName });
  const dataView = await dataViewsService.getDataViewLazy(id);

  const field = dataView.getRuntimeField(name);

  if (!field) {
    throw new ErrorIndexPatternFieldNotFound(id, name);
  }

  return {
    dataView,
    fields: Object.values(dataView.getRuntimeFields({ fieldName: [name] })),
  };
};

const getRuntimeFieldRouteFactory =
  (path: string, serviceKey: SERVICE_KEY_TYPE, description?: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    router.versioned.get({ path, access: 'public', description }).addVersion(
      {
        version: INITIAL_REST_VERSION,
        validate: {
          request: {
            params: schema.object({
              id: schema.string({
                minLength: 1,
                maxLength: 1_000,
              }),
              name: schema.string({
                minLength: 1,
                maxLength: 1_000,
              }),
            }),
          },
          response: {
            200: {
              body: runtimeResponseSchema,
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
        const id = req.params.id;
        const name = req.params.name;

        const { dataView, fields } = await getRuntimeField({
          dataViewsService,
          usageCollection,
          counterName: `${req.route.method} ${path}`,
          id,
          name,
        });

        const response: RuntimeResponseType = await responseFormatter({
          serviceKey,
          dataView,
          fields: fields || [],
        });

        return res.ok(response);
      })
    );
  };

export const registerGetRuntimeFieldRoute = getRuntimeFieldRouteFactory(
  SPECIFIC_RUNTIME_FIELD_PATH,
  SERVICE_KEY,
  GET_RUNTIME_FIELD_DESCRIPTION
);

export const registerGetRuntimeFieldRouteLegacy = getRuntimeFieldRouteFactory(
  SPECIFIC_RUNTIME_FIELD_PATH_LEGACY,
  SERVICE_KEY_LEGACY
);
