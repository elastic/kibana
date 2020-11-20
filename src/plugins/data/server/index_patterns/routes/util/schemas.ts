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

export const serializedFieldFormatSchema = schema.object({
  id: schema.maybe(schema.string()),
  params: schema.maybe(schema.any()),
});

export const fieldSpecSchemaFields = {
  name: schema.string({
    maxLength: 1_000,
  }),
  type: schema.string({
    defaultValue: 'string',
    maxLength: 1_000,
  }),
  searchable: schema.boolean({ defaultValue: false }),
  aggregatable: schema.boolean({ defaultValue: false }),
  count: schema.maybe(
    schema.number({
      min: 0,
    })
  ),
  script: schema.maybe(
    schema.string({
      maxLength: 1_000_000,
    })
  ),
  lang: schema.maybe(
    schema.string({
      maxLength: 1_000,
    })
  ),
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
  customLabel: schema.maybe(schema.string()),
  shortDotsEnable: schema.maybe(schema.boolean()),
};

export const fieldSpecSchema = schema.object(fieldSpecSchemaFields);
