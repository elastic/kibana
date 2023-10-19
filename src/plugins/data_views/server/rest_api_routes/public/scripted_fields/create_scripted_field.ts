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
import { fieldSpecSchema } from '../../../../common/schemas';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../../types';
import { INITIAL_REST_VERSION } from '../../../constants';
import { indexPatternsRuntimeResponseSchema } from '../../schema';
import type { IndexPatternsRuntimeResponseType } from '../../route_types';

export const registerCreateScriptedFieldRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >
) => {
  router.versioned
    .post({ path: '/api/index_patterns/index_pattern/{id}/scripted_field', access: 'public' })
    .addVersion(
      {
        version: INITIAL_REST_VERSION,
        validate: {
          request: {
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
          response: {
            200: {
              body: indexPatternsRuntimeResponseSchema,
            },
          },
        },
      },
      router.handleLegacyErrors(
        handleErrors(async (ctx, req, res) => {
          const core = await ctx.core;
          const savedObjectsClient = core.savedObjects.client;
          const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
          const [, , { dataViewsServiceFactory }] = await getStartServices();
          const indexPatternsService = await dataViewsServiceFactory(
            savedObjectsClient,
            elasticsearchClient,
            req
          );
          const id = req.params.id;
          const { field } = req.body;

          if (!field.scripted) {
            throw new Error('Only scripted fields can be created.');
          }

          const indexPattern = await indexPatternsService.get(id);

          if (indexPattern.fields.getByName(field.name)) {
            throw new Error(`Field [name = ${field.name}] already exists.`);
          }

          indexPattern.upsertScriptedField({
            ...field,
            runtimeField: undefined,
            aggregatable: true,
            searchable: true,
          });

          await indexPatternsService.updateSavedObject(indexPattern);

          const fieldObject = indexPattern.fields.getByName(field.name);
          if (!fieldObject) throw new Error(`Could not create a field [name = ${field.name}].`);

          const body: IndexPatternsRuntimeResponseType = {
            field: fieldObject.toSpec(),
            index_pattern: indexPattern.toSpec(),
          };

          return res.ok({
            headers: {
              'content-type': 'application/json',
            },
            body,
          });
        })
      )
    );
};
