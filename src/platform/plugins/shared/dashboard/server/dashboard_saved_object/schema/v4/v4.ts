/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { dashboardAttributesSchema as dashboardAttributesSchemaV1 } from '../v1';

export const accessControlSchema = schema.maybe(
  schema.object({
    accessMode: schema.maybe(
      schema.oneOf([schema.literal('read_only'), schema.literal('default')])
    ),
    owner: schema.string(),
  })
);

export const dashboardAttributesSchema = dashboardAttributesSchemaV1.extends(
  {
    accessControl: accessControlSchema,
  },
  { unknowns: 'ignore' }
);
