/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * Generated at: 2025-11-27T07:43:24.922Z
 * Source: elasticsearch-specification repository, operations: sql-query, sql-query-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  sql_query1_request,
  sql_query1_response,
  sql_query_request,
  sql_query_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SQL_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.sql.query',
  connectorGroup: 'internal',
  summary: `Get SQL search results`,
  description: `Get SQL search results.

Run an SQL request.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-query`,
  methods: ['POST', 'GET'],
  patterns: ['_sql'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-query',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['format'],
    bodyParams: [
      'allow_partial_search_results',
      'catalog',
      'columnar',
      'cursor',
      'fetch_size',
      'field_multi_value_leniency',
      'filter',
      'index_using_frozen',
      'keep_alive',
      'keep_on_completion',
      'page_timeout',
      'params',
      'query',
      'request_timeout',
      'runtime_mappings',
      'time_zone',
      'wait_for_completion_timeout',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(sql_query_request, 'body'),
      ...getShapeAt(sql_query_request, 'path'),
      ...getShapeAt(sql_query_request, 'query'),
    }),
    z.object({
      ...getShapeAt(sql_query1_request, 'body'),
      ...getShapeAt(sql_query1_request, 'path'),
      ...getShapeAt(sql_query1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([sql_query_response, sql_query1_response]),
};
