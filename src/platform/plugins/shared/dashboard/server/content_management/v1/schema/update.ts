/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema } from '@kbn/config-schema';
import { referenceSchema, updateOptionsSchema } from '@kbn/content-management-utils';

import { getDashboardStateSchema, getDashboardAPICreateResultSchema } from './common';

export const dashboardUpdateOptionsSchema = schema.object({
  references: schema.maybe(schema.arrayOf(referenceSchema)),
  mergeAttributes: schema.maybe(updateOptionsSchema.mergeAttributes),
});

export function getDashboardUpdateRequestAttributesSchema() {
  return schema.object({
    ...getDashboardStateSchema(),
    type: schema.maybe(schema.string()),
    references: schema.maybe(schema.arrayOf(referenceSchema)),
    spaces: schema.maybe(schema.arrayOf(schema.string())),
  });
}

export function getDashboardUpdateResultSchema() {
  return getDashboardAPICreateResultSchema();
}
