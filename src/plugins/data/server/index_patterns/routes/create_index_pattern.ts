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
import { IRouter } from 'src/core/server';

const serializedFieldFormatSchema = schema.object({
  id: schema.maybe(schema.string()),
  params: schema.maybe(schema.any()),
});

const fieldSpecSchema = schema.object({
  name: schema.string(),
  type: schema.string(),
  searchable: schema.boolean(),
  aggregatable: schema.boolean(),
  count: schema.maybe(schema.number()),
  script: schema.maybe(schema.string()),
  lang: schema.maybe(schema.string()),
  conflictDescriptions: schema.maybe(
    schema.recordOf(schema.string(), schema.arrayOf(schema.string()))
  ),
  format: schema.maybe(serializedFieldFormatSchema),
  esTypes: schema.maybe(schema.arrayOf(schema.string())),
  scripted: schema.maybe(schema.boolean()),
  readFromDocValues: schema.maybe(schema.boolean()),
  subType: schema.maybe(
    schema.object({
      multi: schema.maybe(
        schema.object({
          parent: schema.string(),
        })
      ),
      nested: schema.maybe(
        schema.object({
          path: schema.string(),
        })
      ),
    })
  ),
  indexed: schema.maybe(schema.boolean()),
  customName: schema.maybe(schema.string()),
  shortDotsEnable: schema.maybe(schema.boolean()),
});

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
          skip_field_refresh: schema.maybe(schema.boolean({ defaultValue: false })),
          make_default: schema.maybe(schema.boolean({ defaultValue: false })),
          index_pattern: indexPatternSpecSchema,
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      // if (!ctx.indexPatterns) throw new Error('Index pattern context is missing.');
      // const ip = ctx.indexPatterns.indexPatterns;

      return res.ok({
        body: 'yuppppi!',
      });
    })
  );
};
