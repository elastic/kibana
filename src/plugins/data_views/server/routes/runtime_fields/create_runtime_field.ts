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

export const registerCreateRuntimeFieldRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >
) => {
  router.post(
    {
      path: '/api/index_patterns/index_pattern/{id}/runtime_field',
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
        elasticsearchClient
      );
      const id = req.params.id;
      const { name, runtimeField } = req.body;

      const indexPattern = await indexPatternsService.get(id);

      if (indexPattern.fields.getByName(name)) {
        throw new Error(`Field [name = ${name}] already exists.`);
      }

      indexPattern.addRuntimeField(name, runtimeField);

      const addedField = indexPattern.fields.getByName(name);
      if (!addedField) throw new Error(`Could not create a field [name = ${name}].`);

      await indexPatternsService.updateSavedObject(indexPattern);

      const savedField = indexPattern.fields.getByName(name);
      if (!savedField) throw new Error(`Could not create a field [name = ${name}].`);

      return res.ok({
        body: {
          field: savedField.toSpec(),
          index_pattern: indexPattern.toSpec(),
        },
      });
    })
  );
};
