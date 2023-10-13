/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import {
  MIN_SAVED_SEARCH_SAMPLE_SIZE,
  MAX_SAVED_SEARCH_SAMPLE_SIZE,
  VIEW_MODE,
} from '../../common';

const SCHEMA_SEARCH_BASE = {
  // General
  title: schema.string(),
  description: schema.string({ defaultValue: '' }),

  // Data grid
  columns: schema.arrayOf(schema.string(), { defaultValue: [] }),
  sort: schema.oneOf(
    [
      schema.arrayOf(schema.arrayOf(schema.string(), { maxSize: 2 })),
      schema.arrayOf(schema.string(), { maxSize: 2 }),
    ],
    { defaultValue: [] }
  ),
  grid: schema.object(
    {
      columns: schema.maybe(
        schema.recordOf(
          schema.string(),
          schema.object({
            width: schema.maybe(schema.number()),
          })
        )
      ),
    },
    { defaultValue: {} }
  ),
  rowHeight: schema.maybe(schema.number()),
  rowsPerPage: schema.maybe(schema.number()),

  // Chart
  hideChart: schema.boolean({ defaultValue: false }),
  breakdownField: schema.maybe(schema.string()),

  // Search
  kibanaSavedObjectMeta: schema.object({
    searchSourceJSON: schema.string(),
  }),
  isTextBasedQuery: schema.boolean({ defaultValue: false }),
  usesAdHocDataView: schema.maybe(schema.boolean()),

  // Time
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

  // Display
  viewMode: schema.maybe(
    schema.oneOf([
      schema.literal(VIEW_MODE.DOCUMENT_LEVEL),
      schema.literal(VIEW_MODE.AGGREGATED_LEVEL),
    ])
  ),
  hideAggregatedPreview: schema.maybe(schema.boolean()),

  // Legacy
  hits: schema.maybe(schema.number()),
  version: schema.maybe(schema.number()),
};

export const SCHEMA_SEARCH_V8_8_0 = schema.object(SCHEMA_SEARCH_BASE);
export const SCHEMA_SEARCH_V8_12_0 = schema.object({
  ...SCHEMA_SEARCH_BASE,
  sampleSize: schema.maybe(
    schema.number({
      min: MIN_SAVED_SEARCH_SAMPLE_SIZE,
      max: MAX_SAVED_SEARCH_SAMPLE_SIZE,
    })
  ),
});
