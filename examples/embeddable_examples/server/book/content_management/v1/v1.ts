/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { createOptionsSchemas, updateOptionsSchema } from '@kbn/content-management-utils';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';

export const referenceSchema = schema.object(
  {
    name: schema.string(),
    type: schema.string(),
    id: schema.string(),
  },
  { unknowns: 'forbid' }
);

export const bookAttributesSchema = schema.object({
  bookTitle: schema.string(),
  author: schema.string(),
  pages: schema.number(),
  synopsis: schema.maybe(schema.string()),
  published: schema.nullable(schema.number()),
});

export const bookSearchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
      fields: schema.maybe(schema.arrayOf(schema.string())),
      includeReferences: schema.maybe(schema.arrayOf(schema.oneOf([schema.literal('tag')]))),
      kuery: schema.maybe(schema.string()),
      cursor: schema.maybe(schema.number()),
      limit: schema.maybe(schema.number()),
      spaces: schema.maybe(
        schema.arrayOf(schema.string(), {
          meta: {
            description:
              'An array of spaces to search or "*" to search all spaces. Defaults to the current space if not specified.',
          },
        })
      ),
    },
    { unknowns: 'forbid' }
  )
);

export const bookResponseSchema = schema.object({
  item: bookAttributesSchema,
  meta: schema.object({
    id: schema.string(),
    type: schema.string(),
    version: schema.maybe(schema.string()),
    createdAt: schema.maybe(schema.string()),
    updatedAt: schema.maybe(schema.string()),
    createdBy: schema.maybe(schema.string()),
    updatedBy: schema.maybe(schema.string()),
    managed: schema.maybe(schema.boolean()),
    references: schema.arrayOf(referenceSchema),
    namespaces: schema.maybe(schema.arrayOf(schema.string())),
    originId: schema.maybe(schema.string()),
  }),
});

export const bookCreateOptionsSchema = schema.object({
  id: schema.maybe(createOptionsSchemas.id),
  overwrite: schema.maybe(createOptionsSchemas.overwrite),
  references: schema.maybe(schema.arrayOf(referenceSchema)),
  initialNamespaces: schema.maybe(createOptionsSchemas.initialNamespaces),
});

export const bookUpdateOptionsSchema = schema.object({
  references: schema.maybe(schema.arrayOf(referenceSchema)),
  mergeAttributes: schema.maybe(updateOptionsSchema.mergeAttributes),
});

export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: bookResponseSchema,
      },
    },
  },
  create: {
    in: {
      options: {
        schema: bookCreateOptionsSchema,
      },
      data: {
        schema: bookAttributesSchema,
      },
    },
    out: {
      result: {
        schema: bookResponseSchema,
      },
    },
  },
  update: {
    in: {
      options: {
        schema: bookUpdateOptionsSchema,
      },
      data: {
        schema: bookAttributesSchema,
      },
    },
  },
  search: {
    in: {
      options: {
        schema: bookSearchOptionsSchema,
      },
    },
  },
  mSearch: {
    out: {
      result: {
        schema: bookResponseSchema,
      },
    },
  },
};
