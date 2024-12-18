/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import {
  MIN_SAVED_SEARCH_SAMPLE_SIZE,
  MAX_SAVED_SEARCH_SAMPLE_SIZE,
  VIEW_MODE,
} from '../../common';

const SCHEMA_SEARCH_BASE = schema.object({
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
});

export const SCHEMA_SEARCH_V8_8_0 = SCHEMA_SEARCH_BASE;

export const SCHEMA_SEARCH_MODEL_VERSION_1 = SCHEMA_SEARCH_BASE.extends({
  sampleSize: schema.maybe(
    schema.number({
      min: MIN_SAVED_SEARCH_SAMPLE_SIZE,
      max: MAX_SAVED_SEARCH_SAMPLE_SIZE,
    })
  ),
});

export const SCHEMA_SEARCH_MODEL_VERSION_2 = SCHEMA_SEARCH_MODEL_VERSION_1.extends({
  headerRowHeight: schema.maybe(schema.number()),
});

export const SCHEMA_SEARCH_MODEL_VERSION_3 = SCHEMA_SEARCH_MODEL_VERSION_2.extends({
  visContext: schema.maybe(
    schema.oneOf([
      // existing value
      schema.object({
        // unified histogram state
        suggestionType: schema.string(),
        requestData: schema.object({
          dataViewId: schema.maybe(schema.string()),
          timeField: schema.maybe(schema.string()),
          timeInterval: schema.maybe(schema.string()),
          breakdownField: schema.maybe(schema.string()),
        }),
        // lens attributes
        attributes: schema.recordOf(schema.string(), schema.any()),
      }),
      // cleared previous value
      schema.object({}),
    ])
  ),
});

export const SCHEMA_SEARCH_MODEL_VERSION_4 = SCHEMA_SEARCH_MODEL_VERSION_3.extends({
  viewMode: schema.maybe(
    schema.oneOf([
      schema.literal(VIEW_MODE.DOCUMENT_LEVEL),
      schema.literal(VIEW_MODE.PATTERN_LEVEL),
      schema.literal(VIEW_MODE.AGGREGATED_LEVEL),
    ])
  ),
});

export const SCHEMA_SEARCH_MODEL_VERSION_5 = SCHEMA_SEARCH_MODEL_VERSION_4.extends({
  density: schema.maybe(
    schema.oneOf([schema.literal('compact'), schema.literal('normal'), schema.literal('expanded')])
  ),
});
