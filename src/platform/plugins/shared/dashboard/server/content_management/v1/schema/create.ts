/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema } from '@kbn/config-schema';
import { createOptionsSchemas } from '@kbn/content-management-utils';

import {
  searchResultsAttributes,
  dashboardAdditionalAttributes,
  referenceSchema,
  dashboardDataAttributesSchema,
  dashboardMetaSchema,
  dashboardResolveMetaSchema,
} from './common';

export const dashboardCreateOptionsSchema = schema.object({
  id: schema.maybe(createOptionsSchemas.id),
  overwrite: schema.maybe(createOptionsSchemas.overwrite),
  references: schema.maybe(schema.arrayOf(referenceSchema)),
  initialNamespaces: schema.maybe(createOptionsSchemas.initialNamespaces),
  accessControl: schema.maybe(
    schema.object({
      owner: schema.maybe(schema.string()),
      accessMode: schema.maybe(
        schema.oneOf([schema.literal('default'), schema.literal('read_only')])
      ),
    })
  ),
});

export const dashboardCreateSchema = schema
  .object(searchResultsAttributes)
  .extends(dashboardAdditionalAttributes);

export const dashboardStorageCreateResultSchema = schema.object(
  {
    id: schema.string(),
    type: schema.string(),
    data: dashboardDataAttributesSchema,
    meta: dashboardMetaSchema.extends(dashboardResolveMetaSchema),
  },
  { unknowns: 'forbid' }
);
