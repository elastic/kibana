/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema } from '@kbn/config-schema';
import {
  dashboardItemSchema,
  dashboardMetaSchema,
  dashboardResolveMetaSchema,
  dashboardDataAttributesSchema,
  dashboardAPIItemSchema,
} from './common';

export const dashboardGetResultSchema = schema.object(
  {
    item: dashboardItemSchema,
    meta: schema.object(
      {
        outcome: schema.oneOf([
          schema.literal('exactMatch'),
          schema.literal('aliasMatch'),
          schema.literal('conflict'),
        ]),
        aliasTargetId: schema.maybe(schema.string()),
        aliasPurpose: schema.maybe(
          schema.oneOf([
            schema.literal('savedObjectConversion'),
            schema.literal('savedObjectImport'),
          ])
        ),
      },
      { unknowns: 'forbid' }
    ),
  },
  { unknowns: 'forbid' }
);

export const dashboardAPIGetResultSchema = schema.object(
  {
    id: schema.string(),
    type: schema.string(),
    data: dashboardDataAttributesSchema,
    meta: dashboardMetaSchema.extends(dashboardResolveMetaSchema),
  },
  { unknowns: 'forbid' }
);

export const dashboardGetResultMetaSchema = dashboardMetaSchema.extends(dashboardResolveMetaSchema);

export const dashboardListResultAPISchema = schema.object({
  items: schema.arrayOf(dashboardAPIItemSchema),
  total: schema.number(),
});
