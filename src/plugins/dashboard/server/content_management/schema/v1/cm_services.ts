/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import {
  savedObjectSchema,
  objectTypeToGetResultSchema,
  createOptionsSchemas,
  updateOptionsSchema,
  createResultSchema,
} from '@kbn/content-management-utils';

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
    optionsJSON: schema.string({ defaultValue: '{}' }),

    // Legacy
    hits: schema.maybe(schema.number()),
    version: schema.maybe(schema.number()),
  },
  { unknowns: 'forbid' }
);

export const dashboardSavedObjectSchema = savedObjectSchema(dashboardAttributesSchema);

const searchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
    },
    { unknowns: 'forbid' }
  )
);

const createOptionsSchema = schema.object({
  id: schema.maybe(createOptionsSchemas.id),
  overwrite: schema.maybe(createOptionsSchemas.overwrite),
  references: schema.maybe(createOptionsSchemas.references),
});

const dashboardUpdateOptionsSchema = schema.object({
  references: schema.maybe(updateOptionsSchema.references),
  mergeAttributes: schema.maybe(updateOptionsSchema.mergeAttributes),
});

// Content management service definition.
// We need it for BWC support between different versions of the content
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(dashboardSavedObjectSchema),
      },
    },
  },
  create: {
    in: {
      options: {
        schema: createOptionsSchema,
      },
      data: {
        schema: dashboardAttributesSchema,
      },
    },
    out: {
      result: {
        schema: createResultSchema(dashboardSavedObjectSchema),
      },
    },
  },
  update: {
    in: {
      options: {
        schema: dashboardUpdateOptionsSchema,
      },
      data: {
        schema: dashboardAttributesSchema,
      },
    },
  },
  search: {
    in: {
      options: {
        schema: searchOptionsSchema,
      },
    },
  },
  mSearch: {
    out: {
      result: {
        schema: dashboardSavedObjectSchema,
      },
    },
  },
};
