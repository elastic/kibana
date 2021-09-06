/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { RuntimeField } from '../../../../common';
import { handleErrors } from '../util/handle_errors';
import { runtimeFieldSpecSchema } from '../util/schemas';
import { IRouter, StartServicesAccessor } from '../../../../../../core/server';
import type { DataPluginStart, DataPluginStartDependencies } from '../../../plugin';

export const registerCreateRuntimeFieldRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>
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
      const [, , { indexPatterns }] = await getStartServices();
      const indexPatternsService = await indexPatterns.indexPatternsServiceFactory(
        savedObjectsClient,
        elasticsearchClient
      );
      const id = req.params.id;
      const { name, runtimeField } = req.body;

      const indexPattern = await indexPatternsService.get(id);

      if (indexPattern.fields.getByName(name)) {
        throw new Error(`Field [name = ${name}] already exists.`);
      }

      const createdFields = indexPattern.addRuntimeField(name, runtimeField as RuntimeField);

      await indexPatternsService.updateSavedObject(indexPattern);

      return res.ok({
        body: {
          // New API for 7.16 & 8.x. Return an Array of DataViewFields created
          fields: createdFields.map((f) => f.toSpec()),
          // @deprecated
          // To avoid creating a breaking change in 7.16 we continue to support
          // the old "field" in the response
          field: createdFields[0].toSpec(),
          index_pattern: indexPattern.toSpec(),
        },
      });
    })
  );
};
