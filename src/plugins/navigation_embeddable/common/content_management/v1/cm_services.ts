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

const navigationEmbeddableAttributesSchema = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.string()),
    linksJSON: schema.maybe(schema.string()),
  },
  { unknowns: 'forbid' }
);

const navigationEmbeddableSavedObjectSchema = savedObjectSchema(
  navigationEmbeddableAttributesSchema
);

const searchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
    },
    { unknowns: 'forbid' }
  )
);

const navigationEmbeddableCreateOptionsSchema = schema.object({
  id: createOptionsSchemas.id,
  references: schema.maybe(createOptionsSchemas.references),
  overwrite: createOptionsSchemas.overwrite,
});

const navigationEmbeddableUpdateOptionsSchema = schema.object({
  references: updateOptionsSchema.references,
});

// Content management service definition.
// We need it for BWC support between different versions of the content
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(navigationEmbeddableSavedObjectSchema),
      },
    },
  },
  create: {
    in: {
      options: {
        schema: navigationEmbeddableCreateOptionsSchema,
      },
      data: {
        schema: navigationEmbeddableSavedObjectSchema,
      },
    },
    out: {
      result: {
        schema: createResultSchema(navigationEmbeddableSavedObjectSchema),
      },
    },
  },
  update: {
    in: {
      options: {
        schema: navigationEmbeddableUpdateOptionsSchema, // same schema as "create"
      },
      data: {
        schema: navigationEmbeddableSavedObjectSchema,
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
        schema: navigationEmbeddableSavedObjectSchema,
      },
    },
  },
};
