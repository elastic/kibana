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
import { RuntimeField } from '../../../../common/types';
import { handleErrors } from '../util/handle_errors';
import { runtimeFieldSchema } from '../../../../common/schemas';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../../types';
import {
  RUNTIME_FIELD_PATH,
  RUNTIME_FIELD_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
  SERVICE_KEY_TYPE,
  INITIAL_REST_VERSION,
} from '../../../constants';
import { responseFormatter } from './response_formatter';
import { RuntimeResponseType } from '../../route_types';
import { runtimeResponseSchema } from '../../schema';

interface PutRuntimeFieldArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  counterName: string;
  id: string;
  name: string;
  runtimeField: RuntimeField;
}

export const putRuntimeField = async ({
  dataViewsService,
  usageCollection,
  counterName,
  id,
  name,
  runtimeField,
}: PutRuntimeFieldArgs) => {
  usageCollection?.incrementCounter({ counterName });
  const dataView = await dataViewsService.getDataViewLazy(id);

  const oldFieldObject = await dataView.getFieldByName(name);

  if (oldFieldObject && !oldFieldObject.runtimeField) {
    throw new Error('Only runtime fields can be updated');
  }

  if (oldFieldObject) {
    dataView.removeRuntimeField(name);
  }

  const fields = await dataView.addRuntimeField(name, runtimeField);

  await dataViewsService.updateSavedObject(dataView);

  return { dataView, fields };
};

const putRuntimeFieldRouteFactory =
  (path: string, serviceKey: SERVICE_KEY_TYPE) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    router.versioned.put({ path, access: 'public' }).addVersion(
      {
        version: INITIAL_REST_VERSION,
        validate: {
          request: {
            params: schema.object({
              id: schema.string({
                minLength: 1,
                maxLength: 1_000,
              }),
            }),
            body: schema.object({
              name: schema.string({
                minLength: 1,
                maxLength: 1_000,
              }),
              runtimeField: runtimeFieldSchema,
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
        const { name, runtimeField } = req.body as {
          name: string;
          runtimeField: RuntimeField;
        };

        const { dataView, fields } = await putRuntimeField({
          dataViewsService,
          id,
          name,
          runtimeField,
          usageCollection,
          counterName: `${req.route.method} ${path}`,
        });

        const response: RuntimeResponseType = await responseFormatter({
          serviceKey,
          dataView,
          fields,
        });

        return res.ok(response);
      })
    );
  };

export const registerPutRuntimeFieldRoute = putRuntimeFieldRouteFactory(
  RUNTIME_FIELD_PATH,
  SERVICE_KEY
);

export const registerPutRuntimeFieldRouteLegacy = putRuntimeFieldRouteFactory(
  RUNTIME_FIELD_PATH_LEGACY,
  SERVICE_KEY_LEGACY
);
