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
import { IRouter } from '../../../../../core/server';
import { assertIndexPatternsContext } from './util/assert_index_patterns_context';
import { handleErrors } from './util/handle_errors';
import { fieldSpecSchema, serializedFieldFormatSchema } from './util/schemas';

const indexPatternUpdateSchema = schema.object({
  title: schema.maybe(schema.string()),
  type: schema.maybe(schema.string()),
  typeMeta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  timeFieldName: schema.maybe(schema.string()),
  intervalName: schema.maybe(schema.string()),
  sourceFilters: schema.maybe(
    schema.arrayOf(
      schema.object({
        value: schema.string(),
      })
    )
  ),
  fieldFormats: schema.maybe(schema.recordOf(schema.string(), serializedFieldFormatSchema)),
  fields: schema.maybe(schema.recordOf(schema.string(), fieldSpecSchema)),
});

export const registerUpdateIndexPatternRoute = (router: IRouter) => {
  router.post(
    {
      path: '/api/index_patterns/index_pattern/{id}',
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
          skip_field_refresh: schema.maybe(schema.boolean({ defaultValue: false })),
          index_pattern: indexPatternUpdateSchema,
        }),
      },
    },
    router.handleLegacyErrors(
      handleErrors(
        assertIndexPatternsContext(async (ctx, req, res) => {
          const ip = ctx.indexPatterns.indexPatterns;
          const id = req.params.id;

          const indexPattern = await ip.get(id);

          const {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            skip_field_refresh = false,
            index_pattern: {
              title,
              timeFieldName,
              intervalName,
              sourceFilters,
              fieldFormats,
              type,
              typeMeta,
              fields,
            },
          } = req.body;

          let changeCount = 0;
          let doRefreshFields = false;

          if (title !== undefined && title !== indexPattern.title) {
            changeCount++;
            indexPattern.title = title;
          }

          if (timeFieldName !== undefined && timeFieldName !== indexPattern.timeFieldName) {
            changeCount++;
            indexPattern.timeFieldName = timeFieldName;
          }

          if (intervalName !== undefined && intervalName !== indexPattern.intervalName) {
            changeCount++;
            indexPattern.intervalName = intervalName;
          }

          if (sourceFilters !== undefined) {
            changeCount++;
            indexPattern.sourceFilters = sourceFilters;
          }

          if (fieldFormats !== undefined) {
            changeCount++;
            indexPattern.fieldFormatMap = fieldFormats;
          }

          if (type !== undefined) {
            changeCount++;
            indexPattern.type = type;
          }

          if (typeMeta !== undefined) {
            changeCount++;
            indexPattern.typeMeta = typeMeta;
          }

          if (fields !== undefined) {
            changeCount++;
            doRefreshFields = true;
            indexPattern.fields.replaceAll(Object.values(fields || {}));
          }

          if (changeCount < 1) {
            throw new Error('Index pattern change set is empty.');
          }

          await ip.updateSavedObject(indexPattern);

          if (doRefreshFields && !skip_field_refresh) {
            await ip.refreshFields(indexPattern);
          }

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
