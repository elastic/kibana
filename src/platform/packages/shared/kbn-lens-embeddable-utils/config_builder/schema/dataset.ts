/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';

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

export const datasetSchema = {
  /**
   * The dataset configuration. Can be one of the following types:
   * - `dataView`: Use a Kibana data view as the data source. Requires a `name` property with the name of the data view.
   * - `index`: Use a Elasticsearch index as the data source. Requires an `index` property with the name of the index, and optionally a `time_field` property with the name of the time field in the index.
   * - `esql`: Use an ESQL query string as the data source. Requires a `query` property with the ESQL query string.
   * - `table`: Use a Kibana datatable object as the data source. Requires a `table` property with the Kibana datatable object, which should match the Kibana Datatable contract.
   */
  dataset: datasetTypeSchema,
};

export const datasetEsqlTableTypeSchema = schema.oneOf([
  // ESQL dataset type
  schema.object(
    {
      type: schema.literal('esql'),
      /**
       * The ESQL query string to use as the data source.
       * Example: 'FROM my-index | LIMIT 100'
       */
      query: schema.string({
        meta: {
          description:
            'The ESQL query string to use as the data source. Example: "FROM my-index | LIMIT 100".',
        },
      }),
    },
    { meta: { id: 'esqlDatasetTypeSchema' } }
  ),
  // Table dataset type
  schema.object(
    {
      type: schema.literal('table'),
      /**
       * The Kibana datatable object to use as the data source. The structure should match the Kibana Datatable contract.
       */
      table: schema.any({
        meta: {
          description:
            'The Kibana datatable object to use as the data source. Structure should match the Kibana Datatable contract.',
        },
      }),
    },
    { meta: { id: 'tableESQLDatasetTypeSchema' } }
  ),
]);

export const datasetEsqlTableSchema = {
  dataset: datasetEsqlTableTypeSchema,
};

const anyDatasetSchema = schema.oneOf([datasetTypeSchema, datasetEsqlTableTypeSchema], {
  meta: { id: 'datasetSchema' },
});

export type DatasetType = TypeOf<typeof anyDatasetSchema>;
export type DatasetTypeNoESQL = TypeOf<typeof datasetTypeSchema>;
export type DatasetTypeESQL = TypeOf<typeof datasetEsqlTableTypeSchema>;
