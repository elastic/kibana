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
import { FieldSpec } from '../../../../common';
import { ErrorIndexPatternFieldNotFound } from '../../../error';
import { handleErrors } from '../util/handle_errors';
import { fieldSpecSchemaFields } from '../../../schemas';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../../types';
import { INITIAL_REST_VERSION } from '../../../constants';
import { indexPatternsRuntimeResponseSchema } from '../../schema';
import type { IndexPatternsRuntimeResponseType } from '../../route_types';

export const registerUpdateScriptedFieldRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >
) => {
  router.versioned
    .post({
      path: '/api/index_patterns/index_pattern/{id}/scripted_field/{name}',
      access: 'public',
    })
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
                name: schema.string({
                  minLength: 1,
                  maxLength: 1_000,
                }),
              },
              { unknowns: 'allow' }
            ),
            body: schema.object({
              field: schema.object({
                ...fieldSpecSchemaFields,

                // We need to overwrite the below fields on top of `fieldSpecSchemaFields`,
                // because `name` field must not appear here and other below fields
                // should be possible to not provide `schema.maybe()` instead of
                // them being required with a default value in `fieldSpecSchemaFields`.
                name: schema.never(),
                type: schema.maybe(
                  schema.string({
                    maxLength: 1_000,
                  })
                ),
                searchable: schema.maybe(schema.boolean()),
                aggregatable: schema.maybe(schema.boolean()),
              }),
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
          const name = req.params.name;
          const field = { ...req.body.field, name } as unknown as FieldSpec;

          const indexPattern = await indexPatternsService.getDataViewLazy(id);
          let fieldObject = await indexPattern.getFieldByName(name);

          if (!fieldObject) {
            throw new ErrorIndexPatternFieldNotFound(id, name);
          }

          if (!fieldObject.scripted) {
            throw new Error('Only scripted fields can be updated.');
          }

          const oldSpec = fieldObject.toSpec();

          indexPattern.upsertScriptedField({
            ...oldSpec,
            ...field,
            name: field.name,
          });

          await indexPatternsService.updateSavedObject(indexPattern);

          fieldObject = await indexPattern.getFieldByName(name);
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
