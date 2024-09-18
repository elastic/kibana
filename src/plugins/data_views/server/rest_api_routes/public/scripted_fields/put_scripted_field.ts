/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { handleErrors } from '../util/handle_errors';
import { fieldSpecSchema } from '../../../schemas';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../../types';
import { INITIAL_REST_VERSION } from '../../../constants';
import { indexPatternsRuntimeResponseSchema } from '../../schema';
import type { IndexPatternsRuntimeResponseType } from '../../route_types';

export const registerPutScriptedFieldRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >
) => {
  router.versioned
    .put({ path: '/api/index_patterns/index_pattern/{id}/scripted_field', access: 'public' })
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
            throw new Error('Only scripted fields can be put.');
          }

          const indexPattern = await indexPatternsService.getDataViewLazy(id);
          indexPattern.upsertScriptedField({
            ...field,
            runtimeField: undefined, // make sure not creating runttime field with scripted field endpoint
            aggregatable: true,
            searchable: true,
          });

          await indexPatternsService.updateSavedObject(indexPattern);

          const fieldObject = await indexPattern.getFieldByName(field.name);
          if (!fieldObject) throw new Error(`Could not create a field [name = ${field.name}].`);

          const body: IndexPatternsRuntimeResponseType = {
            field: fieldObject.toSpec(),
            index_pattern: await indexPattern.toSpec({ fieldParams: { fieldName: ['*'] } }),
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
