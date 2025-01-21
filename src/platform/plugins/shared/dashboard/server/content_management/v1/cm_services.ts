/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import { dashboardAttributesSchema } from '../../dashboard_saved_object/schema/v1';

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

/**
 * Content management service definition v1.
 * Dashboard attributes in content management version v1 are tightly coupled with the v1 model version saved object schema.
 */
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
