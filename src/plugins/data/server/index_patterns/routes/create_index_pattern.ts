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
import { IndexPatternSpec } from 'src/plugins/data/common';
import { IRouter } from '../../../../../core/server';
import { assertIndexPatternsContext } from './util/assert_index_patterns_context';
import { handleErrors } from './util/handle_errors';
import { fieldSpecSchema, serializedFieldFormatSchema } from './util/schemas';

const indexPatternSpecSchema = schema.object({
  id: schema.maybe(schema.string()),
  version: schema.maybe(schema.string()),
  title: schema.maybe(schema.string()),
  type: schema.maybe(schema.string()),
  intervalName: schema.maybe(schema.string()),
  timeFieldName: schema.maybe(schema.string()),
  sourceFilters: schema.maybe(
    schema.arrayOf(
      schema.object({
        value: schema.string(),
      })
    )
  ),
  fields: schema.maybe(schema.recordOf(schema.string(), fieldSpecSchema)),
  typeMeta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  fieldFormats: schema.maybe(schema.recordOf(schema.string(), serializedFieldFormatSchema)),
  fieldAttrs: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object({
        customName: schema.string(),
      })
    )
  ),
});

export const registerCreateIndexPatternRoute = (router: IRouter) => {
  router.post(
    {
      path: '/api/index_patterns/index_pattern',
      validate: {
        body: schema.object({
          override: schema.maybe(schema.boolean({ defaultValue: false })),
          refresh_fields: schema.maybe(schema.boolean({ defaultValue: true })),
          make_default: schema.maybe(schema.boolean({ defaultValue: true })),
          index_pattern: indexPatternSpecSchema,
        }),
      },
    },
    router.handleLegacyErrors(
      handleErrors(
        assertIndexPatternsContext(async (ctx, req, res) => {
          const ip = ctx.indexPatterns.indexPatterns;
          const body = req.body;
          const indexPattern = await ip.createAndSave(
            body.index_pattern as IndexPatternSpec,
            body.override,
            !body.refresh_fields,
            body.make_default
          );

          return res.ok({
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              index_pattern: indexPattern.toSpec(),
            }),
          });
        })
      )
    )
  );
};
