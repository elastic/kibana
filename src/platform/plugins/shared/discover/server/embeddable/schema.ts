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
import {
  querySchema,
  timeRangeSchema,
  aggregateQuerySchema,
  asCodeFilterSchema,
} from '@kbn/es-query-server';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { VIEW_MODE, Density } from '@kbn/saved-search-plugin/common';

const columnSchema = schema.object({
  column: schema.string(), // field name
  width: schema.maybe(schema.number({ min: 0 })),
});

const sortSchema = schema.object({
  column: schema.string(), // field name
  direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
});

// TODO: This is duplicated from the Lens embeddable schema. We should move these to a shared location.
export const datasetTypeSchema = schema.oneOf([
  // DataView dataset type
  schema.object(
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
  ),
  // Index dataset type
  schema.object(
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
             * Optional format definition for the runtime field. The structure depends on the field type and use case.
             * If not provided, no format is applied.
             */
            format: schema.maybe(
              schema.any({
                meta: {
                  description: 'The type of the runtime field (e.g., "keyword", "long", "date").',
                },
              })
            ),
          }),
          { maxSize: 100 }
        )
      ),
    },
    { meta: { id: 'indexDatasetTypeSchema' } }
  ),
]);

const dataTableSchema = schema.object(
  {
    columns: schema.arrayOf(columnSchema, { maxSize: 100, defaultValue: [] }),
    sort: schema.arrayOf(sortSchema, { maxSize: 100, defaultValue: [] }),
    view_mode: schema.oneOf(
      [
        schema.literal(VIEW_MODE.DOCUMENT_LEVEL),
        schema.literal(VIEW_MODE.PATTERN_LEVEL),
        schema.literal(VIEW_MODE.AGGREGATED_LEVEL),
      ],
      { defaultValue: VIEW_MODE.DOCUMENT_LEVEL }
    ),
    density: schema.oneOf(
      [
        schema.literal(Density.COMPACT),
        schema.literal(Density.EXPANDED),
        schema.literal(Density.NORMAL),
      ],
      { defaultValue: Density.COMPACT }
    ),
    header_row_height: schema.number({
      min: -1,
      max: 5,
      defaultValue: 3,
      meta: {
        description:
          'Height of the header row in the data table. A value of -1 indicates automatic height adjustment based on content.',
      },
    }),
    row_height: schema.number({
      min: -1,
      max: 5,
      defaultValue: 3,
      meta: {
        description:
          'Height of the data row(s) in the data table. A value of -1 indicates automatic height adjustment based on content.',
      },
    }),
    rows_per_page: schema.oneOf(
      [
        schema.literal(10),
        schema.literal(25),
        schema.literal(50),
        schema.literal(100),
        schema.literal(250),
        schema.literal(500),
      ],
      { defaultValue: 100 }
    ),
    sample_size: schema.number({ min: 10, max: 500, defaultValue: 500 }),
  },
  { meta: { id: 'discoverSessionEmbeddableDataTableSchema' } }
);

const classicTabSchema = schema.allOf([
  dataTableSchema,
  schema.object({
    query: schema.maybe(querySchema),
    filters: schema.arrayOf(asCodeFilterSchema, { maxSize: 100, defaultValue: [] }),
    dataset: datasetTypeSchema,
  }),
]);

// TODO: Should we follow Lens & use a dataset instead of a separate query field?
const esqlTabSchema = schema.allOf([
  dataTableSchema,
  schema.object({
    query: schema.maybe(aggregateQuerySchema),
  }),
]);

const tabSchema = schema.oneOf([classicTabSchema, esqlTabSchema]);

export const discoverSessionByValueEmbeddableSchema = schema.allOf([
  serializedTitlesSchema,
  schema.object({
    tabs: schema.arrayOf(tabSchema, { minSize: 1, maxSize: 1 }),
    time_range: schema.maybe(timeRangeSchema),
  }),
]);

export const discoverSessionByReferenceEmbeddableSchema = schema.allOf([
  serializedTitlesSchema,
  schema.object({
    discover_session_id: schema.string(),
    time_range: schema.maybe(timeRangeSchema),
  }),
]);

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
