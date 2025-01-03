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

const apiError = schema.object({
  error: schema.string(),
  message: schema.string(),
  statusCode: schema.number(),
  metadata: schema.object({}, { unknowns: 'allow' }),
});

const referenceSchema = schema.object(
  {
    name: schema.maybe(schema.string()),
    type: schema.string(),
    id: schema.string(),
  },
  { unknowns: 'forbid' }
);

const referencesSchema = schema.arrayOf(referenceSchema);

const eventAnnotationGroupAttributesSchema = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.string()),
    ignoreGlobalFilters: schema.boolean(),
    annotations: schema.arrayOf(schema.any()),
    dataViewSpec: schema.oneOf([schema.literal(null), schema.object({}, { unknowns: 'allow' })]),
  },
  { unknowns: 'forbid' }
);

const eventAnnotationGroupSavedObjectSchema = schema.object(
  {
    id: schema.string(),
    type: schema.string(),
    version: schema.maybe(schema.string()),
    createdAt: schema.maybe(schema.string()),
    updatedAt: schema.maybe(schema.string()),
    error: schema.maybe(apiError),
    attributes: eventAnnotationGroupAttributesSchema,
    references: referencesSchema,
    namespaces: schema.maybe(schema.arrayOf(schema.string())),
    originId: schema.maybe(schema.string()),
  },
  { unknowns: 'allow' }
);

const getResultSchema = schema.object(
  {
    item: eventAnnotationGroupSavedObjectSchema,
    meta: schema.object(
      {
        outcome: schema.oneOf([
          schema.literal('exactMatch'),
          schema.literal('aliasMatch'),
          schema.literal('conflict'),
        ]),
        aliasTargetId: schema.maybe(schema.string()),
        aliasPurpose: schema.maybe(
          schema.oneOf([
            schema.literal('savedObjectConversion'),
            schema.literal('savedObjectImport'),
          ])
        ),
      },
      { unknowns: 'forbid' }
    ),
  },
  { unknowns: 'forbid' }
);

const createOptionsSchema = schema.object({
  references: schema.maybe(referencesSchema),
});

// Content management service definition.
// We need it for BWC support between different versions of the content
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: getResultSchema,
      },
    },
  },
  create: {
    in: {
      options: {
        schema: createOptionsSchema,
      },
      data: {
        schema: eventAnnotationGroupAttributesSchema,
      },
    },
    out: {
      result: {
        schema: schema.object(
          {
            item: eventAnnotationGroupSavedObjectSchema,
          },
          { unknowns: 'forbid' }
        ),
      },
    },
  },
  update: {
    in: {
      options: {
        schema: createOptionsSchema, // same schema as "create"
      },
      data: {
        schema: eventAnnotationGroupAttributesSchema,
      },
    },
  },
  search: {
    in: {
      options: {
        schema: schema.maybe(
          schema.object(
            {
              searchFields: schema.maybe(schema.arrayOf(schema.string())),
              types: schema.maybe(schema.arrayOf(schema.string())),
            },
            { unknowns: 'forbid' }
          )
        ),
      },
    },
  },
};
