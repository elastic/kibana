/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { dashboardAttributesSchema as dashboardAttributesSchemaV3 } from '../v3';

export * from '../v3/v3';

export const dashboardAttributesSchema = dashboardAttributesSchemaV3.extends(
  {
    project_routing: schema.maybe(schema.string()),
  },
  { unknowns: 'ignore' }
);
