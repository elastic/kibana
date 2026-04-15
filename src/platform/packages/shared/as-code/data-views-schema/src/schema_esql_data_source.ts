/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { AS_CODE_ESQL_DATA_SOURCE_TYPE } from './constants';

export const esqlDataSourceSchema = schema.object(
  {
    type: schema.literal(AS_CODE_ESQL_DATA_SOURCE_TYPE),
    /**
     * An ES|QL query that drives the data source. The query must produce a tabular result set;
     * column names from the result are used as field references.
     * Example: 'FROM logs-* | STATS count = COUNT(*) BY host.name'
     */
    query: schema.string({
      meta: {
        description:
          'An ES|QL query that drives the data source. The query must produce a tabular result set; column names are used as field references. Example: "FROM logs-* | STATS count = COUNT(*) BY host.name".',
      },
    }),
  },
  {
    meta: {
      id: 'esqlDataSource',
      title: 'ES|QL Data Source',
      description:
        'Uses an ES|QL query as the data source. The query is executed at render time; resulting columns are available as fields.',
    },
  }
);
