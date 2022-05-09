/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { handleErrors } from '../util/handle_errors';
import { fieldSpecSchema } from '../util/schemas';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../types';

export const registerPutScriptedFieldRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >
) => {
  router.put(
    {
      path: '/api/index_patterns/index_pattern/{id}/scripted_field',
      validate: {
        params: schema.object(
          {
            id: schema.string({
              minLength: 1,
              maxLength: 1_000,
            }),
          },
          { unknowns: 'allow' }
        ),
        body: schema.object({
          field: fieldSpecSchema,
        }),
      },
    },
    router.handleLegacyErrors(
      handleErrors(async (ctx, req, res) => {
        const core = await ctx.core;
        const savedObjectsClient = core.savedObjects.client;
        const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
        const [, , { indexPatternsServiceFactory }] = await getStartServices();
        const indexPatternsService = await indexPatternsServiceFactory(
          savedObjectsClient,
          elasticsearchClient,
          req
        );
        const id = req.params.id;
        const { field } = req.body;

        if (!field.scripted) {
          throw new Error('Only scripted fields can be put.');
        }

        const indexPattern = await indexPatternsService.get(id);

        const oldFieldObject = indexPattern.fields.getByName(field.name);
        if (!!oldFieldObject) {
          indexPattern.fields.remove(oldFieldObject);
        }

        indexPattern.fields.add({
          ...field,
          aggregatable: true,
          searchable: true,
        });

        await indexPatternsService.updateSavedObject(indexPattern);

        const fieldObject = indexPattern.fields.getByName(field.name);
        if (!fieldObject) throw new Error(`Could not create a field [name = ${field.name}].`);

        return res.ok({
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            field: fieldObject.toSpec(),
            index_pattern: indexPattern.toSpec(),
          }),
        });
      })
    )
  );
};
