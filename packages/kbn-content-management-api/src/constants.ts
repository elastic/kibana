/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';

export const contentManagementApiVersions = {
  '2023-10-31': '2023-10-31',
} as const;

export const baseGetSchema = schema.object({
  id: schema.string(),
  type: schema.string(),
  references: schema.arrayOf(
    schema.object({
      name: schema.string(),
      type: schema.string(),
      id: schema.string(),
    }),
    { defaultValue: [] }
  ),
  namespaces: schema.maybe(schema.arrayOf(schema.string())),
  updatedAt: schema.maybe(schema.string()),
  updatedBy: schema.maybe(schema.string()),
  error: schema.maybe(schema.string()),
  createdAt: schema.maybe(schema.string()),
  createdBy: schema.maybe(schema.string()),
  managed: schema.maybe(schema.boolean()),
  version: schema.maybe(schema.string()),
  attributes: schema.maybe(schema.any()),
});
