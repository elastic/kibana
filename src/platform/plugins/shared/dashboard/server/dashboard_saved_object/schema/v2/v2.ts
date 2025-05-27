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

// sections only include y + i for grid data
export const sectionGridDataSchema = schema.object({
  y: schema.number({ meta: { description: 'The y coordinate of the section in grid units' } }),
  i: schema.string({
    meta: { description: 'The unique identifier of the section' },
  }),
});

// panels include all grid data keys, including those that sections use
export const gridDataSchema = sectionGridDataSchema.extends({
  x: schema.number(),
  w: schema.number(),
  h: schema.number(),
  sectionId: schema.maybe(schema.string()),
});

export const sectionSchema = schema.object({
  title: schema.string({
    meta: { description: 'The title of the section.' },
  }),
  collapsed: schema.maybe(
    schema.boolean({
      meta: { description: 'The collapsed state of the section.' },
      defaultValue: false,
    })
  ),
  gridData: sectionGridDataSchema,
});

export const controlGroupInputSchema = controlGroupInputSchemaV1.extends(
  {
    showApplySelections: schema.maybe(schema.boolean()),
  },
  { unknowns: 'ignore' }
);

export const dashboardAttributesSchema = dashboardAttributesSchemaV1.extends(
  {
    controlGroupInput: schema.maybe(controlGroupInputSchema),
    sections: schema.maybe(schema.arrayOf(sectionSchema)),
  },
  { unknowns: 'ignore' }
);
