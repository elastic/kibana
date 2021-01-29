/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  format: schema.maybe(serializedFieldFormatSchema),
  esTypes: schema.maybe(schema.arrayOf(schema.string())),
  scripted: schema.maybe(schema.boolean()),
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
  customLabel: schema.maybe(schema.string()),
  shortDotsEnable: schema.maybe(schema.boolean()),
};

export const fieldSpecSchema = schema.object(fieldSpecSchemaFields);
