/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { dashboardMetaSchema, getDashboardDataSchema } from '../content_management/v1/schema';

export function getDashboardResponseBodySchema() {
  return schema.object({
    id: schema.string(),
    data: getDashboardDataSchema(),
    meta: dashboardMetaSchema,
    spaces: schema.maybe(schema.arrayOf(schema.string())),
  });
}
