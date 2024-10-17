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
  controlGroupInputSchema as controlGroupInputSchemaV1,
  dashboardAttributesSchema as dashboardAttributesSchemaV1,
} from '../v1';

export const controlGroupInputSchema = controlGroupInputSchemaV1.extends(
  {
    showApplySelections: schema.maybe(schema.boolean()),
  },
  { unknowns: 'ignore' }
);

export const dashboardAttributesSchema = dashboardAttributesSchemaV1.extends(
  {
    controlGroupInput: schema.maybe(controlGroupInputSchema),
  },
  { unknowns: 'ignore' }
);

export const gridDataSchema = schema.object({
  x: schema.number(),
  y: schema.number(),
  w: schema.number(),
  h: schema.number(),
  i: schema.string(),
});
