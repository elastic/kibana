/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema } from '@kbn/config-schema';
import { createOptionsSchemas, referenceSchema } from '@kbn/content-management-utils';

import { getDashboardDataSchema, dashboardMetaSchema, dashboardResolveMetaSchema } from './common';

export const dashboardCreateOptionsSchema = schema.object({
  id: schema.maybe(createOptionsSchemas.id),
  overwrite: schema.maybe(createOptionsSchemas.overwrite),
  references: schema.maybe(schema.arrayOf(referenceSchema)),
  initialNamespaces: schema.maybe(createOptionsSchemas.initialNamespaces),
});

export function getDashboardStorageCreateResultSchema() {
  return schema.object(
    {
      id: schema.string(),
      type: schema.string(),
      data: getDashboardDataSchema(),
      meta: dashboardMetaSchema.extends(dashboardResolveMetaSchema),
    },
    { unknowns: 'forbid' }
  );
}
