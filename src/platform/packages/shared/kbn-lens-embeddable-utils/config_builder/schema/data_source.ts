/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { dataViewSchema } from '@kbn/as-code-data-views-schema';

export const dataSourceSchema = {
  data_source: dataViewSchema,
};

export const dataSourceEsqlTableTypeSchema = schema.oneOf([
  // ESQL datasource type
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
    { meta: { id: 'esqlDataset', title: 'ES|QL Dataset' } }
  ),
  // Table datasource type
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
    { meta: { id: 'tableESQLDataset', title: 'ES|QL Table Dataset' } }
  ),
]);

export const dataSourceEsqlTableSchema = {
  data_source: dataSourceEsqlTableTypeSchema,
};

const anyDataSourceSchema = schema.oneOf([dataViewSchema, dataSourceEsqlTableTypeSchema], {
  meta: { id: 'viz_data_source', title: 'Data Source configuration' },
});

export type DataSourceTypeNoESQL = TypeOf<typeof dataViewSchema>;
export type DataSourceTypeESQL = TypeOf<typeof dataSourceEsqlTableTypeSchema>;

export type DataSourceType = TypeOf<typeof anyDataSourceSchema>;
