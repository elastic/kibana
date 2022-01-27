/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCounter } from 'src/plugins/usage_collection/server';
import { DataViewsService, RuntimeField } from 'src/plugins/data_views/common';
import { schema } from '@kbn/config-schema';
import { handleErrors } from '../util/handle_errors';
import { runtimeFieldSpecSchema } from '../util/schemas';
import { IRouter, StartServicesAccessor } from '../../../../../core/server';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../types';
import {
  RUNTIME_FIELD_PATH,
  RUNTIME_FIELD_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
  SERVICE_KEY_TYPE,
} from '../../constants';

interface CreateRuntimeFieldArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  counterName: string;
  id: string;
  name: string;
  runtimeField: RuntimeField;
}

const createRuntimeField = async ({
  dataViewsService,
  usageCollection,
  counterName,
  id,
  name,
  runtimeField,
}: CreateRuntimeFieldArgs) => {
  usageCollection?.incrementCounter({ counterName });
  const dataView = await dataViewsService.get(id);

  if (dataView.fields.getByName(name)) {
    throw new Error(`Field [name = ${name}] already exists.`);
  }

  dataView.addRuntimeField(name, runtimeField);

  const addedField = dataView.fields.getByName(name);
  if (!addedField) throw new Error(`Could not create a field [name = ${name}].`);

  await dataViewsService.updateSavedObject(dataView);

  const savedField = dataView.fields.getByName(name);
  if (!savedField) throw new Error(`Could not create a field [name = ${name}].`);

  return { dataView, savedField };
};

const runtimeCreateFieldRouteFactory =
  (path: string, serviceKey: SERVICE_KEY_TYPE) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    router.post(
      {
        path,
        validate: {
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
            runtimeField: runtimeFieldSpecSchema,
          }),
        },
      },
      handleErrors(async (ctx, req, res) => {
        const savedObjectsClient = ctx.core.savedObjects.client;
        const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
        const [, , { dataViewsServiceFactory }] = await getStartServices();
        const dataViewsService = await dataViewsServiceFactory(
          savedObjectsClient,
          elasticsearchClient,
          req
        );
        const id = req.params.id;
        const { name, runtimeField } = req.body;

        const { dataView, savedField } = await createRuntimeField({
          dataViewsService,
          usageCollection,
          counterName: `${req.route.method} ${path}`,
          id,
          name,
          runtimeField,
        });

        const response = {
          body: {
            fields: [savedField.toSpec()],
            [serviceKey]: dataView.toSpec(),
          },
        };

        const legacyResponse = {
          body: {
            [serviceKey]: dataView.toSpec(),
            field: savedField.toSpec(),
          },
        };

        return res.ok(serviceKey === SERVICE_KEY_LEGACY ? legacyResponse : response);
      })
    );
  };

export const registerCreateRuntimeFieldRoute = runtimeCreateFieldRouteFactory(
  RUNTIME_FIELD_PATH,
  SERVICE_KEY
);

export const registerCreateRuntimeFieldRouteLegacy = runtimeCreateFieldRouteFactory(
  RUNTIME_FIELD_PATH_LEGACY,
  SERVICE_KEY_LEGACY
);
