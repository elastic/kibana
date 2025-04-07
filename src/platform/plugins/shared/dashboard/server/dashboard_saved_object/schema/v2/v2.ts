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

export const sectionSchema = schema.object({
  id: schema.string({
    meta: { description: 'The unique ID of the section.' },
  }),
  order: schema.number({
    min: 1,
    meta: {
      description:
        'The order that sections should be rendered in. These values should be unique, and the order `0` is reserved for the main dashhboard content.',
    },
  }),
  title: schema.string({
    meta: { description: 'The title of the section.' },
  }),
  collapsed: schema.maybe(
    schema.boolean({
      meta: { description: 'The collapsed state of the section.' },
      defaultValue: false,
    })
  ),
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

export const gridDataSchema = schema.object({
  x: schema.number(),
  y: schema.number(),
  w: schema.number(),
  h: schema.number(),
  i: schema.string(),
  sectionId: schema.maybe(schema.string()),
});
