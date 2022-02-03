/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCounter } from 'src/plugins/usage_collection/server';
import { DataViewsService } from 'src/plugins/data_views/common';
import { schema } from '@kbn/config-schema';
import { ErrorIndexPatternFieldNotFound } from '../../error';
import { handleErrors } from '../util/handle_errors';
import { IRouter, StartServicesAccessor } from '../../../../../core/server';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../types';
import { SPECIFIC_RUNTIME_FIELD_PATH, SPECIFIC_RUNTIME_FIELD_PATH_LEGACY } from '../../constants';

interface DeleteRuntimeFieldArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  counterName: string;
  id: string;
  name: string;
}

export const deleteRuntimeField = async ({
  dataViewsService,
  usageCollection,
  counterName,
  id,
  name,
}: DeleteRuntimeFieldArgs) => {
  usageCollection?.incrementCounter({ counterName });
  const dataView = await dataViewsService.get(id);
  const field = dataView.getRuntimeField(name);

  if (!field) {
    throw new ErrorIndexPatternFieldNotFound(id, name);
  }

  dataView.removeRuntimeField(name);

  await dataViewsService.updateSavedObject(dataView);
};

const deleteRuntimeFieldRouteFactory =
  (path: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    router.delete(
      {
        path,
        validate: {
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
        const name = req.params.name;

        await deleteRuntimeField({
          dataViewsService,
          usageCollection,
          id,
          name,
          counterName: `${req.route.method} ${path}`,
        });

        return res.ok();
      })
    );
  };

export const registerDeleteRuntimeFieldRoute = deleteRuntimeFieldRouteFactory(
  SPECIFIC_RUNTIME_FIELD_PATH
);

export const registerDeleteRuntimeFieldRouteLegacy = deleteRuntimeFieldRouteFactory(
  SPECIFIC_RUNTIME_FIELD_PATH_LEGACY
);
