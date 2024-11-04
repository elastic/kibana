/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, ObjectType } from '@kbn/config-schema';

export const apiError = schema.object({
  error: schema.string(),
  message: schema.string(),
  statusCode: schema.number(),
  metadata: schema.object({}, { unknowns: 'allow' }),
});

export const referenceSchema = schema.object(
  {
    name: schema.maybe(schema.string()),
    type: schema.string(),
    id: schema.string(),
  },
  { unknowns: 'forbid' }
);

export const referencesSchema = schema.arrayOf(referenceSchema);

export const savedObjectSchema = (attributesSchema: ObjectType<any>) =>
  schema.object(
    {
      id: schema.string(),
      type: schema.string(),
      version: schema.maybe(schema.string()),
      createdAt: schema.maybe(schema.string()),
      updatedAt: schema.maybe(schema.string()),
      error: schema.maybe(apiError),
      attributes: attributesSchema,
      references: referencesSchema,
      namespaces: schema.maybe(schema.arrayOf(schema.string())),
      originId: schema.maybe(schema.string()),
    },
    { unknowns: 'allow' }
  );

export const objectTypeToGetResultSchema = (soSchema: ObjectType<any>) =>
  schema.object(
    {
      item: soSchema,
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

// its recommended to create a subset of this schema for stricter validation
export const createOptionsSchemas = {
  id: schema.maybe(schema.string()),
  references: schema.maybe(referencesSchema),
  overwrite: schema.maybe(schema.boolean()),
  version: schema.maybe(schema.string()),
  refresh: schema.maybe(schema.boolean()),
  initialNamespaces: schema.maybe(schema.arrayOf(schema.string())),
};

export const schemaAndOr = schema.oneOf([schema.literal('AND'), schema.literal('OR')]);

// its recommended to create a subset of this schema for stricter validation
export const searchOptionsSchemas = {
  page: schema.maybe(schema.number()),
  perPage: schema.maybe(schema.number()),
  sortField: schema.maybe(schema.string()),
  sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
  fields: schema.maybe(schema.arrayOf(schema.string())),
  search: schema.maybe(schema.string()),
  searchFields: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
  rootSearchFields: schema.maybe(schema.arrayOf(schema.string())),

  hasReference: schema.maybe(schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema)])),
  hasReferenceOperator: schema.maybe(schemaAndOr),
  hasNoReference: schema.maybe(schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema)])),
  hasNoReferenceOperator: schema.maybe(schemaAndOr),
  defaultSearchOperator: schema.maybe(schemaAndOr),
  namespaces: schema.maybe(schema.arrayOf(schema.string())),
  type: schema.maybe(schema.string()),

  filter: schema.maybe(schema.string()),
  pit: schema.maybe(
    schema.object({ id: schema.string(), keepAlive: schema.maybe(schema.string()) })
  ),
};

// its recommended to create a subset of this schema for stricter validation
export const updateOptionsSchema = {
  references: schema.maybe(referencesSchema),
  version: schema.maybe(schema.string()),
  refresh: schema.maybe(schema.oneOf([schema.boolean(), schema.literal('wait_for')])),
  upsert: (attributesSchema: ObjectType<any>) => schema.maybe(savedObjectSchema(attributesSchema)),
  retryOnConflict: schema.maybe(schema.number()),
  mergeAttributes: schema.maybe(schema.boolean()),
};

export const createResultSchema = (soSchema: ObjectType<any>) =>
  schema.object(
    {
      item: soSchema,
    },
    { unknowns: 'forbid' }
  );
