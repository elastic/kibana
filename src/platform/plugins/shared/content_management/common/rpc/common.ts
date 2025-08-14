/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const itemResultSchema = schema.object(
  {
    data: schema.object({
      title: schema.string(),
      timeFieldName: schema.maybe(schema.string()),
      allowNoIndex: schema.maybe(schema.boolean()),
      name: schema.maybe(schema.string()),
      sourceFilters: schema.maybe(schema.arrayOf(schema.string())),
      fieldFormatMap: schema.maybe(schema.recordOf(schema.string(), schema.any())),
    }, { unknowns: 'allow' }),
    meta: schema.maybe(schema.object({
      updatedAt: schema.maybe(schema.string()),
      createdAt: schema.maybe(schema.string()),
      updatedBy: schema.maybe(schema.string()),
      createdBy: schema.maybe(schema.string()),
      managed: schema.maybe(schema.boolean()),
      references: schema.maybe(schema.arrayOf(schema.object({
        id: schema.string(),
        name: schema.string(),
        type: schema.string(),
      }))),
      namespaces: schema.maybe(schema.arrayOf(schema.string())),
    }, { unknowns: 'allow' })),
    id: schema.string(),
    type: schema.string(),
  },
  { unknowns: 'forbid' }
);
