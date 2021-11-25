/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { RuntimeField } from '../../../common';
import { handleErrors } from '../util/handle_errors';
import { runtimeFieldSpecSchema } from '../util/schemas';
import { IRouter, StartServicesAccessor } from '../../../../../core/server';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../types';

export const registerPutRuntimeFieldRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >
) => {
  router.put(
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
      const { name, runtimeField } = req.body as {
        name: string;
        runtimeField: RuntimeField;
      };

      const indexPattern = await indexPatternsService.get(id);

      const oldRuntimeFieldObject = indexPattern.getRuntimeField(name);

      if (oldRuntimeFieldObject) {
        indexPattern.removeRuntimeField(name);
      }

      const createdFields = indexPattern.addRuntimeField(name, runtimeField);

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
