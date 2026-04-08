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

export const dataSourceEsqlTypeSchema = schema.object(
  {
    type: schema.literal('esql'),
    /**
     * An ES|QL query that drives the visualization. The query must produce a tabular result set;
     * column names from the result are used as field references in metrics and breakdowns.
     * Example: 'FROM logs-* | STATS count = COUNT(*) BY host.name'
     */
    query: schema.string({
      meta: {
        description:
          'An ES|QL query that drives the visualization. The query must produce a tabular result set; column names are used as field references in metrics and breakdowns. Example: "FROM logs-* | STATS count = COUNT(*) BY host.name".',
      },
    }),
  },
  {
    meta: {
      id: 'esqlDataset',
      title: 'ES|QL Dataset',
      description:
        'Uses an ES|QL query as the data source. The query is executed at render time and the resulting columns are available as fields for the visualization.',
    },
  }
);

const anyDataSourceSchema = schema.oneOf([dataViewSchema, dataSourceEsqlTypeSchema], {
  meta: {
    id: 'viz_data_source',
    title: 'Data Source configuration',
    description:
      'Defines where the visualization reads its data. Choose a data view (by reference or ad hoc) for index-pattern-based queries, or an ES|QL dataset for query-driven results.',
  },
});

export const dataSourceSchema = {
  data_source: dataViewSchema,
};

export const dataSourceEsqlTableSchema = {
  data_source: dataSourceEsqlTypeSchema,
};

export type DataSourceTypeNoESQL = TypeOf<typeof dataViewSchema>;
export type DataSourceTypeESQL = TypeOf<typeof dataSourceEsqlTypeSchema>;

export type DataSourceType = TypeOf<typeof anyDataSourceSchema>;
