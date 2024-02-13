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
import { MIN_SAVED_SEARCH_SAMPLE_SIZE, MAX_SAVED_SEARCH_SAMPLE_SIZE } from '../../constants';

const sortSchema = schema.arrayOf(schema.string(), { maxSize: 2 });

const savedSearchAttributesSchema = schema.object(
  {
    title: schema.string(),
    sort: schema.oneOf([sortSchema, schema.arrayOf(sortSchema)]),
    columns: schema.arrayOf(schema.string()),
    description: schema.string(),
    grid: schema.object({
      columns: schema.maybe(
        schema.recordOf(
          schema.string(),
          schema.object({
            width: schema.maybe(schema.number()),
          })
        )
      ),
    }),
    hideChart: schema.maybe(schema.boolean()),
    isTextBasedQuery: schema.maybe(schema.boolean()),
    usesAdHocDataView: schema.maybe(schema.boolean()),
    kibanaSavedObjectMeta: schema.object({
      searchSourceJSON: schema.string(),
    }),
    viewMode: schema.maybe(
      schema.oneOf([schema.literal('documents'), schema.literal('aggregated')])
    ),
    hideAggregatedPreview: schema.maybe(schema.boolean()),
    rowHeight: schema.maybe(schema.number()),
    headerRowHeight: schema.maybe(schema.number()),
    hits: schema.maybe(schema.number()),
    timeRestore: schema.maybe(schema.boolean()),
    timeRange: schema.maybe(
      schema.object({
        from: schema.string(),
        to: schema.string(),
      })
    ),
    refreshInterval: schema.maybe(
      schema.object({
        pause: schema.boolean(),
        value: schema.number(),
      })
    ),
    rowsPerPage: schema.maybe(schema.number()),
    sampleSize: schema.maybe(
      schema.number({
        min: MIN_SAVED_SEARCH_SAMPLE_SIZE,
        max: MAX_SAVED_SEARCH_SAMPLE_SIZE,
      })
    ),
    breakdownField: schema.maybe(schema.string()),
    version: schema.maybe(schema.number()),
  },
  { unknowns: 'forbid' }
);

const savedSearchSavedObjectSchema = savedObjectSchema(savedSearchAttributesSchema);

const savedSearchCreateOptionsSchema = schema.maybe(
  schema.object({
    id: createOptionsSchemas.id,
    references: createOptionsSchemas.references,
    overwrite: createOptionsSchemas.overwrite,
  })
);

const savedSearchUpdateOptionsSchema = schema.maybe(
  schema.object({
    references: updateOptionsSchema.references,
  })
);
const savedSearchSearchOptionsSchema = schema.maybe(
  schema.object({
    searchFields: schema.maybe(schema.arrayOf(schema.string())),
    fields: schema.maybe(schema.arrayOf(schema.string())),
  })
);

// Content management service definition.
// We need it for BWC support between different versions of the content
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(savedSearchSavedObjectSchema),
      },
    },
  },
  create: {
    in: {
      options: {
        schema: savedSearchCreateOptionsSchema,
      },
      data: {
        schema: savedSearchAttributesSchema,
      },
    },
    out: {
      result: {
        schema: createResultSchema(savedSearchSavedObjectSchema),
      },
    },
  },
  update: {
    in: {
      options: {
        schema: savedSearchUpdateOptionsSchema,
      },
      data: {
        schema: savedSearchAttributesSchema,
      },
    },
  },
  search: {
    in: {
      options: {
        schema: savedSearchSearchOptionsSchema,
      },
    },
  },
  mSearch: {
    out: {
      result: {
        schema: savedSearchSavedObjectSchema,
      },
    },
  },
};
