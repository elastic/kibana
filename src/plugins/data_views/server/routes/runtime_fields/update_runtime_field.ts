/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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

export const registerUpdateRuntimeFieldRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >
) => {
  router.post(
    {
      path: '/api/index_patterns/index_pattern/{id}/runtime_field/{name}',
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
      const indexPatternsService = await indexPatternsServiceFactory(
        savedObjectsClient,
        elasticsearchClient
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

      return res.ok({
        body: {
          field: fieldObject.toSpec(),
          index_pattern: indexPattern.toSpec(),
        },
      });
    })
  );
};
