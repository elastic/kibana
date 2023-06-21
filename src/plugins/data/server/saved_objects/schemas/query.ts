/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';

// As per `SavedQueryAttributes`
export const SCHEMA_QUERY_V8_8_0 = schema.object({
  title: schema.string(),
  description: schema.string({ defaultValue: '' }),
  query: schema.object({
    language: schema.string(),
    query: schema.oneOf([schema.string(), schema.object({}, { unknowns: 'allow' })]),
  }),
  filters: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
  timefilter: schema.maybe(
    schema.object({
      from: schema.string(),
      to: schema.string(),
      refreshInterval: schema.maybe(
        schema.object({
          value: schema.number(),
          pause: schema.boolean(),
        })
      ),
    })
  ),
});
