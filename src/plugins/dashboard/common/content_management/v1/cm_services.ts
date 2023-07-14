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
  createResultSchema,
} from '@kbn/content-management-utils';

const dashboardAttributesSchema = schema.object(
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
    controlGroupInput: schema.maybe(
      schema.object({
        panelsJSON: schema.maybe(schema.string()),
        controlStyle: schema.maybe(schema.string()),
        chainingSystem: schema.maybe(schema.string()),
        ignoreParentSettingsJSON: schema.maybe(schema.string()),
      })
    ),
    panelsJSON: schema.string({ defaultValue: '[]' }),
    optionsJSON: schema.string({ defaultValue: '{}' }),

    // Legacy
    hits: schema.maybe(schema.number()),
    version: schema.maybe(schema.number()),
  },
  { unknowns: 'forbid' }
);

const dashboardSavedObjectSchema = savedObjectSchema(dashboardAttributesSchema);

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
        schema: createOptionsSchema, // same schema as "create"
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
