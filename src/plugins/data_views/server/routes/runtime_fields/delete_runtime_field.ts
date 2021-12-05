/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { ErrorIndexPatternFieldNotFound } from '../../error';
import { handleErrors } from '../util/handle_errors';
import { IRouter, StartServicesAccessor } from '../../../../../core/server';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../types';
import { SPECIFIC_RUNTIME_FIELD_PATH, SPECIFIC_RUNTIME_FIELD_PATH_LEGACY } from '../../constants';

const deleteRuntimeFieldRouteFactory =
  (path: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >
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
        const [, , { indexPatternsServiceFactory }] = await getStartServices();
        const indexPatternsService = await indexPatternsServiceFactory(
          savedObjectsClient,
          elasticsearchClient,
          req
        );
        const id = req.params.id;
        const name = req.params.name;

        const indexPattern = await indexPatternsService.get(id);
        const field = indexPattern.fields.getByName(name);

        if (!field) {
          throw new ErrorIndexPatternFieldNotFound(id, name);
        }

        if (!field.runtimeField) {
          throw new Error('Only runtime fields can be deleted.');
        }

        indexPattern.removeRuntimeField(name);

        await indexPatternsService.updateSavedObject(indexPattern);

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
