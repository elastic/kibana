/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { DataGridDensity } from '@kbn/discover-utils';
import { aggregateQuerySchema, querySchema, timeRangeSchema } from '@kbn/es-query-server';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';

const columnSchema = schema.object({
  name: schema.string({
    meta: {
      description: 'The name of the field to display in the data table.',
    },
  }),
  width: schema.maybe(
    schema.number({
      min: 0,
      meta: {
        description: 'Optional width of the column in pixels.',
      },
    })
  ),
});

const sortSchema = schema.object({
  name: schema.string({
    meta: {
      description: 'The name of the field to sort by.',
    },
  }),
  direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
    meta: {
      description:
        'The direction to sort the field by: Use "asc" for ascending or "desc" for descending.',
    },
  }),
});

/**
 * TODO: These are duplicated from the Lens embeddable schema. We should move these to a shared location.
 * @see datasetTypeSchema
 */
export const dataViewReferenceSchema = schema.object(
  {
    type: schema.literal('dataView'),
    /**
     * The name of the Kibana data view to use as the data source.
     * Example: 'my-data-view'
     */
    id: schema.string({
      meta: {
        description:
          'The id of the Kibana data view to use as the data source. Example: "my-data-view".',
      },
    }),
  },
  { meta: { id: 'dataViewDatasetTypeSchema' } }
);

export const dataViewSpecSchema = schema.object(
  {
    type: schema.literal('index'),
    /**
     * The name of the Elasticsearch index to use as the data source.
     * Example: 'my-index-*'
     */
    index: schema.string({
      meta: {
        description:
          'The name of the Elasticsearch index to use as the data source. Example: "my-index-*".',
      },
    }),
    /**
     * The name of the time field in the index. Used for time-based filtering.
     * Example: '@timestamp'
     */
    time_field: schema.maybe(
      schema.string({
        meta: {
          description:
            'The name of the time field in the index. Used for time-based filtering. Example: "@timestamp".',
        },
      })
    ),
    /**
     * Optional array of runtime fields to define on the index. Each runtime field describes a computed field available at query time.
     * If not provided, no runtime fields are used.
     */
    runtime_fields: schema.maybe(
      schema.arrayOf(
        schema.object({
          /**
           * The type of the runtime field (e.g., 'keyword', 'long', 'date').
           * Example: 'keyword'
           */
          type: schema.string({
            meta: {
              description: 'The type of the runtime field (e.g., "keyword", "long", "date").',
            },
          }),
          /**
           * The name of the runtime field.
           * Example: 'my_runtime_field'
           */
          name: schema.string({
            meta: {
              description: 'The name of the runtime field. Example: "my_runtime_field".',
            },
          }),
          /**
           * The script that defines the runtime field. This should be a painless script that computes the field value at query time.
           * Example: 'emit(doc["field_name"].value * 2);'
           */
          script: schema.maybe(
            schema.string({
              meta: {
                description:
                  'The script that defines the runtime field. This should be a painless script that computes the field value at query time.',
              },
            })
          ),
          /**
           * Optional format definition for the runtime field. The structure depends on the field type and use case.
           * If not provided, no format is applied.
           */
          format: schema.maybe(
            schema.any({
              meta: {
                description:
                  'Optional format definition for the runtime field. The structure depends on the field type and use case.',
              },
            })
          ),
        }),
        { maxSize: 100 }
      )
    ),
  },
  { meta: { id: 'indexDatasetTypeSchema' } }
);

export const dataViewSchema = schema.oneOf([dataViewReferenceSchema, dataViewSpecSchema]);

const dataTableLimitsSchema = schema.object(
  {
    rows_per_page: schema.maybe(
      schema.oneOf(
        [
          schema.literal(10),
          schema.literal(25),
          schema.literal(50),
          schema.literal(100),
          schema.literal(250),
          schema.literal(500),
        ],
        {
          defaultValue: 100,
          meta: {
            description:
              'The number of rows to display per page in the data table. If omitted, defaults to the advanced setting "discover:sampleRowsPerPage".',
          },
        }
      )
    ),
    sample_size: schema.maybe(
      schema.number({
        min: 10,
        max: 10000,
        defaultValue: 500,
        meta: {
          description:
            'The number of documents to sample for the data table. If omitted, defaults to the advanced setting "discover:sampleSize".',
        },
      })
    ),
  },
  { meta: { id: 'discoverSessionEmbeddableDataTableLimitsSchema' } }
);

const dataTableSchema = schema.object(
  {
    columns: schema.maybe(
      schema.arrayOf(columnSchema, {
        maxSize: 100,
        defaultValue: [],
        meta: {
          description:
            'List of columns to display in the data table. If omitted, defaults to the advanced setting "defaultColumns".',
        },
      })
    ),
    sort: schema.arrayOf(sortSchema, {
      maxSize: 100,
      defaultValue: [],
      meta: {
        description: 'Sort configuration for the data table (field and direction).',
      },
    }),
    view_mode: schema.oneOf(
      [
        schema.literal(VIEW_MODE.DOCUMENT_LEVEL),
        schema.literal(VIEW_MODE.PATTERN_LEVEL),
        schema.literal(VIEW_MODE.AGGREGATED_LEVEL),
      ],
      {
        defaultValue: VIEW_MODE.DOCUMENT_LEVEL,
        meta: {
          description:
            'Discover view mode. Choose "documents" (search hits), "patterns" (pattern analysis), or "aggregated" (field statistics).',
        },
      }
    ),
    density: schema.oneOf(
      [
        schema.literal(DataGridDensity.COMPACT),
        schema.literal(DataGridDensity.EXPANDED),
        schema.literal(DataGridDensity.NORMAL),
      ],
      {
        defaultValue: DataGridDensity.COMPACT,
        meta: {
          description:
            'Data grid density. Choose "compact", "expanded", or "normal" for row spacing.',
        },
      }
    ),
    header_row_height: schema.oneOf(
      [
        schema.number({
          min: 1,
          max: 5,
        }),
        schema.literal('auto'),
      ],
      {
        meta: {
          description: 'Header row height. Use a number (1–5) or "auto" to size based on content.',
        },
      }
    ),
    row_height: schema.maybe(
      schema.oneOf(
        [
          schema.number({
            min: 1,
            max: 20,
          }),
          schema.literal('auto'),
        ],
        {
          defaultValue: 3,
          meta: {
            description:
              'Data row height. Use a number (1–20) or "auto" to size based on content. If omitted, defaults to the advanced setting "discover:rowHeightOption".',
          },
        }
      )
    ),
  },
  { meta: { id: 'discoverSessionEmbeddableDataTableSchema' } }
);

const classicTabSchema = schema.allOf([
  dataTableSchema,
  dataTableLimitsSchema,
  schema.object({
    query: schema.maybe(querySchema),
    filters: schema.arrayOf(asCodeFilterSchema, {
      maxSize: 100,
      defaultValue: [],
      meta: {
        description: 'List of filters to apply to the data in the tab.',
      },
    }),
    dataset: dataViewSchema,
  }),
]);

const esqlTabSchema = schema.allOf([
  dataTableSchema,
  schema.object(
    { query: aggregateQuerySchema },
    {
      meta: {
        description: 'ES|QL (Elasticsearch Query Language) statement.',
      },
    }
  ),
]);

const tabSchema = schema.oneOf([classicTabSchema, esqlTabSchema]);

const discoverSessionBaseEmbeddableSchema = serializedTitlesSchema.extends({
  timeRange: schema.maybe(timeRangeSchema), // Waiting on https://github.com/elastic/kibana/pull/253789
});

const discoverSessionByValueEmbeddableSchema = discoverSessionBaseEmbeddableSchema.extends({
  tabs: schema.arrayOf(tabSchema, {
    minSize: 1,
    maxSize: 1,
    meta: {
      description: 'Array of tabs for the Discover session embeddable. Currently supports one tab.',
    },
  }),
});

const discoverSessionByReferenceEmbeddableSchema = discoverSessionBaseEmbeddableSchema.extends({
  discover_session_id: schema.string(),
  selected_tab_id: schema.maybe(
    schema.string({
      meta: {
        description:
          'The selected tab in the Discover session. If omitted, defaults to the first tab.',
      },
    })
  ),
});

export const discoverSessionEmbeddableSchema = schema.oneOf([
  discoverSessionByValueEmbeddableSchema,
  discoverSessionByReferenceEmbeddableSchema,
]);

export type DiscoverSessionEmbeddableByValueState = TypeOf<
  typeof discoverSessionByValueEmbeddableSchema
>;
export type DiscoverSessionEmbeddableByReferenceState = TypeOf<
  typeof discoverSessionByReferenceEmbeddableSchema
>;
export type DiscoverSessionEmbeddableState =
  | DiscoverSessionEmbeddableByValueState
  | DiscoverSessionEmbeddableByReferenceState;
