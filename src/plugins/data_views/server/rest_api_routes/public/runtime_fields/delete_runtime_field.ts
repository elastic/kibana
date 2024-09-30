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
import { DataViewsService } from '../../../../common';
import { ErrorIndexPatternFieldNotFound } from '../../../error';
import { handleErrors } from '../util/handle_errors';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../../types';
import {
  SPECIFIC_RUNTIME_FIELD_PATH,
  SPECIFIC_RUNTIME_FIELD_PATH_LEGACY,
  INITIAL_REST_VERSION,
  DELETE_RUNTIME_FIELD_DESCRIPTION,
} from '../../../constants';

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
  const dataView = await dataViewsService.getDataViewLazy(id);
  const field = dataView.getRuntimeField(name);

  if (!field) {
    throw new ErrorIndexPatternFieldNotFound(id, name);
  }

  dataView.removeRuntimeField(name);

  await dataViewsService.updateSavedObject(dataView);
};

const deleteRuntimeFieldRouteFactory =
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
              body: () => schema.never(),
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
  SPECIFIC_RUNTIME_FIELD_PATH,
  DELETE_RUNTIME_FIELD_DESCRIPTION
);

export const registerDeleteRuntimeFieldRouteLegacy = deleteRuntimeFieldRouteFactory(
  SPECIFIC_RUNTIME_FIELD_PATH_LEGACY
);
