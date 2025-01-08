/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const controlGroupInputSchema = schema
  .object({
    panelsJSON: schema.maybe(schema.string()),
    controlStyle: schema.maybe(schema.string()),
    chainingSystem: schema.maybe(schema.string()),
    ignoreParentSettingsJSON: schema.maybe(schema.string()),
  })
  .extends({}, { unknowns: 'ignore' });

export const dashboardAttributesSchema = schema.object(
  {
    // General
    title: schema.string(),
    description: schema.string({ defaultValue: '' }),

    // Search
    kibanaSavedObjectMeta: schema.object({
      searchSourceJSON: schema.maybe(schema.string()),
    }),

    // Time
    timeRestore: schema.maybe(schema.boolean()),
    timeFrom: schema.maybe(schema.string()),
    timeTo: schema.maybe(schema.string()),
    refreshInterval: schema.maybe(
      schema.object({
        pause: schema.boolean(),
        value: schema.number(),
        display: schema.maybe(schema.string()),
        section: schema.maybe(schema.number()),
      })
    ),

    // Dashboard Content
    controlGroupInput: schema.maybe(controlGroupInputSchema),
    panelsJSON: schema.string({ defaultValue: '[]' }),
    optionsJSON: schema.maybe(schema.string()),

    // Legacy
    hits: schema.maybe(schema.number()),
    version: schema.maybe(schema.number()),
  },
  { unknowns: 'forbid' }
);
