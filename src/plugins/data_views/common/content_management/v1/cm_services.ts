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
  searchOptionsSchemas,
} from '@kbn/content-management-utils';
import { DataViewType } from '../..';
import { MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH } from '../../constants';
import { serializedFieldFormatSchema, fieldSpecSchema } from '../../schemas';

const dataViewAttributesSchema = schema.object(
  {
    title: schema.string(),
    type: schema.maybe(schema.literal(DataViewType.ROLLUP)),
    timeFieldName: schema.maybe(schema.string()),
    sourceFilters: schema.maybe(
      schema.arrayOf(
        schema.object({
          value: schema.string(),
          clientId: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
        })
      )
    ),
    fields: schema.maybe(schema.arrayOf(fieldSpecSchema)),
    typeMeta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    fieldFormatMap: schema.maybe(schema.recordOf(schema.string(), serializedFieldFormatSchema)),
    fieldAttrs: schema.maybe(
      schema.recordOf(
        schema.string(),
        schema.object({
          customLabel: schema.maybe(schema.string()),
          customDescription: schema.maybe(
            schema.string({
              maxLength: MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH,
            })
          ),
          count: schema.maybe(schema.number()),
        })
      )
    ),
    allowNoIndex: schema.maybe(schema.boolean()),
    runtimeFieldMap: schema.maybe(schema.any()),
    name: schema.maybe(schema.string()),
    allowHidden: schema.maybe(schema.boolean()),
  },
  { unknowns: 'forbid' }
);

const dataViewSavedObjectSchema = savedObjectSchema(dataViewAttributesSchema);

const dataViewCreateOptionsSchema = schema.object({
  id: createOptionsSchemas.id,
  initialNamespaces: createOptionsSchemas.initialNamespaces,
  overwrite: schema.maybe(createOptionsSchemas.overwrite),
});

const dataViewSearchOptionsSchema = schema.object({
  searchFields: searchOptionsSchemas.searchFields,
  fields: searchOptionsSchemas.fields,
});

const dataViewUpdateOptionsSchema = schema.object({
  version: updateOptionsSchema.version,
  refresh: updateOptionsSchema.refresh,
  retryOnConflict: updateOptionsSchema.retryOnConflict,
});

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
        schema: dataViewCreateOptionsSchema,
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
        schema: dataViewUpdateOptionsSchema,
      },
      data: {
        schema: dataViewAttributesSchema,
      },
    },
  },
  search: {
    in: {
      options: {
        schema: dataViewSearchOptionsSchema,
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
