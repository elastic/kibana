/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
} from '../../constants';

const putRuntimeFieldRouteFactory =
  (path: string, serviceKey: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >
  ) => {
    router.put(
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
        const [, , { indexPatternsServiceFactory }] = await getStartServices();
        const indexPatternsService = await indexPatternsServiceFactory(
          savedObjectsClient,
          elasticsearchClient,
          req
        );
        const id = req.params.id;
        const { name, runtimeField } = req.body;

        const indexPattern = await indexPatternsService.get(id);

        const oldFieldObject = indexPattern.fields.getByName(name);

        if (oldFieldObject && !oldFieldObject.runtimeField) {
          throw new Error('Only runtime fields can be updated');
        }

        if (oldFieldObject) {
          indexPattern.removeRuntimeField(name);
        }

        indexPattern.addRuntimeField(name, runtimeField);

        await indexPatternsService.updateSavedObject(indexPattern);

        const fieldObject = indexPattern.fields.getByName(name);
        if (!fieldObject) throw new Error(`Could not create a field [name = ${name}].`);

        const legacyResponse = {
          body: {
            field: fieldObject.toSpec(),
            [serviceKey]: indexPattern.toSpec(),
          },
        };

        const response = {
          body: {
            fields: [fieldObject.toSpec()],
            [serviceKey]: indexPattern.toSpec(),
          },
        };

        return res.ok(serviceKey === SERVICE_KEY_LEGACY ? legacyResponse : response);
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
