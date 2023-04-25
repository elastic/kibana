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
  createOptionsSchema,
  createResultSchema,
} from '@kbn/content-management-utils';
// import { fieldSpecSchema, serializedFieldFormatSchema, runtimeFieldSchema } from '../../schemas';

const dataViewAttributesSchema = schema.object(
  {
    title: schema.string(),
    type: schema.maybe(schema.string()),
    timeFieldName: schema.maybe(schema.string()),
    sourceFilters: schema.maybe(
      schema.arrayOf(
        schema.object({
          value: schema.string(),
        })
      )
    ),
    // fields: schema.maybe(schema.recordOf(schema.string(), fieldSpecSchema)),
    fields: schema.maybe(schema.any()),
    typeMeta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    // fieldFormats: schema.maybe(schema.recordOf(schema.string(), serializedFieldFormatSchema)),
    // fieldFormats: schema.maybe(schema.any()),
    fieldFormatMap: schema.maybe(schema.any()),
    /*
    fieldAttrs: schema.maybe(
      schema.recordOf(
        schema.string(),
        schema.object({
          customLabel: schema.maybe(schema.string()),
          count: schema.maybe(schema.number()),
        })
      )
    ),
    */
    fieldAttrs: schema.maybe(schema.any()),
    allowNoIndex: schema.maybe(schema.boolean()),
    // runtimeFieldMap: schema.maybe(schema.recordOf(schema.string(), runtimeFieldSchema)),
    runtimeFieldMap: schema.maybe(schema.any()),
    name: schema.maybe(schema.string()),
    // todo
    // version: schema.maybe(schema.string()),
  },
  { unknowns: 'forbid' }
);

const dataViewSavedObjectSchema = savedObjectSchema(dataViewAttributesSchema);

const searchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
    },
    { unknowns: 'forbid' }
  )
);

// Content management service definition.
// We need it for BWC support between different versions of the content
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(dataViewSavedObjectSchema),
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
        schema: createResultSchema(dataViewSavedObjectSchema),
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
    in: {
      options: {
        schema: searchOptionsSchema,
      },
    },
  },
  mSearch: {
    out: {
      result: {
        schema: dataViewSavedObjectSchema,
      },
    },
  },
};
