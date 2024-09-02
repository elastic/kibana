/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import { versionSchema } from './common';

import type { ProcedureSchemas } from '../../../common';

export const searchQuerySchema = schema.oneOf([
  schema.object(
    {
      text: schema.maybe(schema.string()),
      tags: schema.maybe(
        schema.object({
          included: schema.maybe(schema.arrayOf(schema.string())),
          excluded: schema.maybe(schema.arrayOf(schema.string())),
        })
      ),
      limit: schema.maybe(schema.number()),
      cursor: schema.maybe(schema.string()),
    },
    {
      unknowns: 'forbid',
    }
  ),
]);

export const searchResultSchema = schema.object({
  hits: schema.arrayOf(schema.any()),
  pagination: schema.object({
    total: schema.number(),
    cursor: schema.maybe(schema.string()),
  }),
});

export const searchSchemas: ProcedureSchemas = {
  in: schema.object(
    {
      contentTypeId: schema.string(),
      version: versionSchema,
      query: searchQuerySchema,
      options: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    },
    { unknowns: 'forbid' }
  ),
  out: schema.object(
    {
      contentTypeId: schema.string(),
      result: searchResultSchema,
      meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    },
    { unknowns: 'forbid' }
  ),
};
