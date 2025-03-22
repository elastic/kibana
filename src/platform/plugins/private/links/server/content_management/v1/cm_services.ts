/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type {
  ContentManagementServicesDefinition as ServicesDefinition,
  VersionableObject,
} from '@kbn/object-versioning';
import {
  savedObjectSchema,
  createResultSchema,
  updateOptionsSchema,
  createOptionsSchemas,
  objectTypeToGetResultSchema,
} from '@kbn/content-management-utils';
import { savedObjectLinksAttributesSchema } from '../../saved_objects/schema/v1';

const linksSavedObjectSchema = savedObjectSchema(savedObjectLinksAttributesSchema);

const searchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
    },
    { unknowns: 'forbid' }
  )
);

const linksCreateOptionsSchema = schema.object({
  references: schema.maybe(createOptionsSchemas.references),
  overwrite: createOptionsSchemas.overwrite,
});

const linksUpdateOptionsSchema = schema.object({
  references: updateOptionsSchema.references,
});

// Content management service definition.
// We need it for BWC support between different versions of the content
export const cmServiceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(linksSavedObjectSchema),
      },
    },
  },
  create: {
    in: {
      options: {
        schema: linksCreateOptionsSchema,
      },
      data: {
        schema: savedObjectLinksAttributesSchema,
        up: (attributes) => {
          // TODO inject references...
          return attributes;
        },
      },
    },
    out: {
      result: {
        schema: createResultSchema(linksSavedObjectSchema),
      },
    },
  },
  update: {
    in: {
      options: {
        schema: linksUpdateOptionsSchema, // same schema as "create"
      },
      data: {
        schema: savedObjectLinksAttributesSchema,
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
        schema: linksSavedObjectSchema,
      },
    },
  },
};

export const embeddableVersionableObject: VersionableObject = {
  schema: savedObjectLinksAttributesSchema,
  up: (attributes) => {
    // TODO inject references...
    return attributes;
  },
};
