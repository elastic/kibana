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

// todo
const dataViewAttributesSchema = schema.object(
  {
    title: schema.string(),
    name: schema.string(),
    timeFieldName: schema.maybe(schema.string()),
    fields: schema.maybe(schema.string()),
    fieldAttrs: schema.maybe(schema.string()),
    sourceFilters: schema.maybe(schema.string()),
    fieldFormatMap: schema.maybe(schema.string()),
    type: schema.maybe(schema.string()),
    typeMeta: schema.maybe(schema.string()),
    allowNoIndex: schema.maybe(schema.boolean()),
    runtimeFieldMap: schema.maybe(schema.string()),
  },
  { unknowns: 'forbid' }
);

const dataViewSavedObjectSchema = schema.object(
  {
    id: schema.string(),
    type: schema.string(),
    version: schema.maybe(schema.string()),
    createdAt: schema.maybe(schema.string()),
    updatedAt: schema.maybe(schema.string()),
    error: schema.maybe(apiError),
    attributes: dataViewAttributesSchema,
    references: referencesSchema,
    namespaces: schema.maybe(schema.arrayOf(schema.string())),
    originId: schema.maybe(schema.string()),
  },
  { unknowns: 'allow' }
);

/*
const getResultSchema = schema.object(
  {
    item: schema.any(), // todo dataViewSavedObjectSchema,
    outcome: schema.oneOf([
      schema.literal('exactMatch'),
      schema.literal('aliasMatch'),
      schema.literal('conflict'),
    ]),
    aliasTargetId: schema.maybe(schema.string()),
    aliasPurpose: schema.maybe(
      schema.oneOf([schema.literal('savedObjectConversion'), schema.literal('savedObjectImport')])
    ),
  },
  { unknowns: 'allow' }
);*/

const getResultSchema = schema.object(
  {
    item: schema.any(),
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
  id: schema.maybe(schema.string()),
});

// const hasReferenceSchema = schema.maybe(schema.oneOf([referenceSchema, referencesSchema]));

/*
const searchQuerySchema = schema.object(
  {
    search: schema.maybe(schema.string()),
    fields: schema.maybe(schema.arrayOf(schema.string())),
    searchFields: schema.maybe(schema.arrayOf(schema.string())),
    perPage: schema.maybe(schema.number()),
    page: schema.maybe(schema.number()),
    defaultSearchOperator: schema.maybe(
      schema.oneOf([schema.literal('AND'), schema.literal('OR')])
    ),
    hasReference: hasReferenceSchema,
    hasNoReference: hasReferenceSchema,
  },
  { unknowns: 'forbid' }
);
*/

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
        schema: dataViewAttributesSchema,
      },
    },
    out: {
      result: {
        schema: dataViewSavedObjectSchema,
      },
    },
  },
  update: {
    in: {
      options: {
        schema: createOptionsSchema, // same schema as "create"
      },
      data: {
        schema: dataViewAttributesSchema,
      },
    },
  },
  search: {
    in: {},
    out: {},
  },
};
