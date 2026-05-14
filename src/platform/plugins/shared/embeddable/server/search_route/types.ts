/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const requestTypeSchema = schema.object({
  type: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
  search: schema.maybe(schema.string()),
  limit: schema.maybe(schema.number()),
  tags: schema.maybe(
    schema.object({
      included: schema.maybe(schema.arrayOf(schema.string())),
      excluded: schema.maybe(schema.arrayOf(schema.string())),
    })
  ),
});

export type RequestType = TypeOf<typeof requestTypeSchema>;

export const responseTypeSchema = schema.object({
  hits: schema.arrayOf(schema.any()),
  total: schema.number(),
});

export type ResponseType = TypeOf<typeof responseTypeSchema>;
