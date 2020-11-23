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
import { IRouter } from '../../../../../../core/server';
import { ErrorIndexPatternFieldNotFound } from '../../error';
import { assertIndexPatternsContext } from '../util/assert_index_patterns_context';
import { handleErrors } from '../util/handle_errors';
import { fieldSpecSchemaFields } from '../util/schemas';

export const registerUpdateFieldRoute = (router: IRouter) => {
  router.post(
    {
      path: '/api/index_patterns/index_pattern/{id}/field/{name}',
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
          refresh_fields: schema.maybe(schema.boolean({ defaultValue: true })),
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
      handleErrors(
        assertIndexPatternsContext(async (ctx, req, res) => {
          const ip = ctx.indexPatterns.indexPatterns;
          const id = req.params.id;
          const name = req.params.name;
          const {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            refresh_fields = true,
          } = req.body;

          const field = ({ ...req.body.field, name } as unknown) as FieldSpec;

          const indexPattern = await ip.get(id);
          let fieldObject = indexPattern.fields.getByName(field.name);

          if (!fieldObject) {
            throw new ErrorIndexPatternFieldNotFound(id, name);
          }

          const oldSpec = fieldObject.toSpec();

          indexPattern.fields.remove(fieldObject);
          indexPattern.fields.add({
            ...oldSpec,
            ...field,
          });

          await ip.updateSavedObject(indexPattern);
          if (refresh_fields) {
            await ip.refreshFields(indexPattern);
          }

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
    )
  );
};
