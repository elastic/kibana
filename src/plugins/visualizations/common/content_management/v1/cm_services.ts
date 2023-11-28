/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

const visualizeAttributesSchema = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.nullable(schema.string())),
    version: schema.maybe(schema.number()),
    kibanaSavedObjectMeta: schema.maybe(schema.object({ searchSourceJSON: schema.string() })),
    uiStateJSON: schema.maybe(schema.string()),
    visState: schema.maybe(schema.string()),
    savedSearchRefName: schema.maybe(schema.string()),
  },
  { unknowns: 'forbid' }
);

const visualizeSavedObjectSchema = schema.object(
  {
    id: schema.string(),
    type: schema.string(),
    version: schema.maybe(schema.string()),
    createdAt: schema.maybe(schema.string()),
    updatedAt: schema.maybe(schema.string()),
    error: schema.maybe(apiError),
    attributes: visualizeAttributesSchema,
    references: referencesSchema,
    namespaces: schema.maybe(schema.arrayOf(schema.string())),
    originId: schema.maybe(schema.string()),
  },
  { unknowns: 'allow' }
);

const getResultSchema = schema.object(
  {
    item: visualizeSavedObjectSchema,
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
  overwrite: schema.maybe(schema.boolean()),
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
        schema: visualizeAttributesSchema,
      },
    },
    out: {
      result: {
        schema: schema.object(
          {
            item: visualizeSavedObjectSchema,
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
        schema: visualizeAttributesSchema,
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
