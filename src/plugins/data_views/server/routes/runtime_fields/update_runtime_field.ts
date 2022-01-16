/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCounter } from 'src/plugins/usage_collection/server';
import { schema } from '@kbn/config-schema';
import { RuntimeField } from 'src/plugins/data_views/common';
import { ErrorIndexPatternFieldNotFound } from '../../error';
import { handleErrors } from '../util/handle_errors';
import { runtimeFieldSpec, runtimeFieldSpecTypeSchema } from '../util/schemas';
import { IRouter, StartServicesAccessor } from '../../../../../core/server';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../types';
import {
  SPECIFIC_RUNTIME_FIELD_PATH,
  SPECIFIC_RUNTIME_FIELD_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
  SERVICE_KEY_TYPE,
} from '../../constants';

const updateRuntimeFieldRouteFactory =
  (path: string, serviceKey: SERVICE_KEY_TYPE) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection: UsageCounter
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
            name: schema.string({
              minLength: 1,
              maxLength: 1_000,
            }),
          }),
          body: schema.object({
            name: schema.never(),
            runtimeField: schema.object({
              ...runtimeFieldSpec,
              // We need to overwrite the below fields on top of `runtimeFieldSpec`,
              // because some fields would be optional
              type: schema.maybe(runtimeFieldSpecTypeSchema),
            }),
          }),
        },
      },
      handleErrors(async (ctx, req, res) => {
        const savedObjectsClient = ctx.core.savedObjects.client;
        const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
        const [, , { indexPatternsServiceFactory }] = await getStartServices();
        usageCollection.incrementCounter({ counterName: path });
        const indexPatternsService = await indexPatternsServiceFactory(
          savedObjectsClient,
          elasticsearchClient,
          req
        );
        const id = req.params.id;
        const name = req.params.name;
        const runtimeField = req.body.runtimeField as Partial<RuntimeField>;

        const indexPattern = await indexPatternsService.get(id);
        const existingRuntimeField = indexPattern.getRuntimeField(name);

        if (!existingRuntimeField) {
          throw new ErrorIndexPatternFieldNotFound(id, name);
        }

        indexPattern.removeRuntimeField(name);
        indexPattern.addRuntimeField(name, {
          ...existingRuntimeField,
          ...runtimeField,
        });

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

export const registerUpdateRuntimeFieldRoute = updateRuntimeFieldRouteFactory(
  SPECIFIC_RUNTIME_FIELD_PATH,
  SERVICE_KEY
);

export const registerUpdateRuntimeFieldRouteLegacy = updateRuntimeFieldRouteFactory(
  SPECIFIC_RUNTIME_FIELD_PATH_LEGACY,
  SERVICE_KEY_LEGACY
);
