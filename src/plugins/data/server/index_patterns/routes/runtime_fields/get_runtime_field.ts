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
import { IRouter, StartServicesAccessor } from '../../../../../../core/server';
import type { DataPluginStart, DataPluginStartDependencies } from '../../../plugin';

export const registerGetRuntimeFieldRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>
) => {
  router.get(
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
      const name = req.params.name;

      const indexPattern = await indexPatternsService.get(id);

      const field = indexPattern.fields.getByName(name);

      if (!field) {
        throw new ErrorIndexPatternFieldNotFound(id, name);
      }

      if (!field.runtimeField) {
        throw new Error('Only runtime fields can be retrieved.');
      }

      return res.ok({
        body: {
          field: field.toSpec(),
          runtimeField: indexPattern.getRuntimeField(name),
        },
      });
    })
  );
};
