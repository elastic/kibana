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
import { DataViewsService } from '../../../../common/data_views';
import { RuntimeField } from '../../../../common/types';
import { ErrorIndexPatternFieldNotFound } from '../../../error';
import { handleErrors } from '../util/handle_errors';
import { runtimeFieldSchemaUpdate } from '../../../schemas';
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
  UPDATE_RUNTIME_FIELD_DESCRIPTION,
} from '../../../constants';
import { responseFormatter } from './response_formatter';
import { runtimeResponseSchema } from '../../schema';
import type { RuntimeResponseType } from '../../route_types';

interface UpdateRuntimeFieldArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  counterName: string;
  id: string;
  name: string;
  runtimeField: Partial<RuntimeField>;
}

export const updateRuntimeField = async ({
  dataViewsService,
  usageCollection,
  counterName,
  id,
  name,
  runtimeField,
}: UpdateRuntimeFieldArgs) => {
  usageCollection?.incrementCounter({ counterName });
  const dataView = await dataViewsService.getDataViewLazy(id);
  const existingRuntimeField = dataView.getRuntimeField(name);

  if (!existingRuntimeField) {
    throw new ErrorIndexPatternFieldNotFound(id, name);
  }

  dataView.removeRuntimeField(name);
  const fields = await dataView.addRuntimeField(name, {
    ...existingRuntimeField,
    ...runtimeField,
  });

  await dataViewsService.updateSavedObject(dataView);

  return { dataView, fields };
};

const updateRuntimeFieldRouteFactory =
  (path: string, serviceKey: SERVICE_KEY_TYPE, description?: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    router.versioned.post({ path, access: 'public', description }).addVersion(
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
            body: schema.object({
              name: schema.never(),
              runtimeField: runtimeFieldSchemaUpdate,
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
        const runtimeField = req.body.runtimeField as Partial<RuntimeField>;

        const { dataView, fields } = await updateRuntimeField({
          dataViewsService,
          usageCollection,
          counterName: `${req.route.method} ${path}`,
          id,
          name,
          runtimeField,
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

export const registerUpdateRuntimeFieldRoute = updateRuntimeFieldRouteFactory(
  SPECIFIC_RUNTIME_FIELD_PATH,
  SERVICE_KEY,
  UPDATE_RUNTIME_FIELD_DESCRIPTION
);

export const registerUpdateRuntimeFieldRouteLegacy = updateRuntimeFieldRouteFactory(
  SPECIFIC_RUNTIME_FIELD_PATH_LEGACY,
  SERVICE_KEY_LEGACY
);
