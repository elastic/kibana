/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { dataViewSchema, esqlDataSourceSchema } from '@kbn/as-code-data-views-schema';

const anyDataSourceSchema = schema.oneOf([dataViewSchema, esqlDataSourceSchema], {
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
  data_source: esqlDataSourceSchema,
};

export type DataSourceTypeNoESQL = TypeOf<typeof dataViewSchema>;
export type DataSourceTypeESQL = TypeOf<typeof esqlDataSourceSchema>;

export type DataSourceType = TypeOf<typeof anyDataSourceSchema>;
