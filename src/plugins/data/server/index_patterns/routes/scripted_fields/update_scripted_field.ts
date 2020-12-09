/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schema } from '@kbn/config-schema';
import { FieldSpec } from 'src/plugins/data/common';
import { ErrorIndexPatternFieldNotFound } from '../../error';
import { handleErrors } from '../util/handle_errors';
import { fieldSpecSchemaFields } from '../util/schemas';
import { IRouter, StartServicesAccessor } from '../../../../../../core/server';
import type { DataPluginStart, DataPluginStartDependencies } from '../../../plugin';

export const registerUpdateScriptedFieldRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>
) => {
  router.post(
    {
      path: '/api/index_patterns/index_pattern/{id}/scripted_field/{name}',
      validate: {
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
    },
    router.handleLegacyErrors(
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
        const field = ({ ...req.body.field, name } as unknown) as FieldSpec;

        const indexPattern = await indexPatternsService.get(id);
        let fieldObject = indexPattern.fields.getByName(field.name);

        if (!fieldObject) {
          throw new ErrorIndexPatternFieldNotFound(id, name);
        }

        if (!fieldObject.scripted) {
          throw new Error('Only scripted fields can be updated.');
        }

        const oldSpec = fieldObject.toSpec();

        indexPattern.fields.remove(fieldObject);
        indexPattern.fields.add({
          ...oldSpec,
          ...field,
        });

        await indexPatternsService.updateSavedObject(indexPattern);

        fieldObject = indexPattern.fields.getByName(field.name);
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
