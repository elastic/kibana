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
 * Generated at: 2025-11-27T07:43:24.869Z
 * Source: elasticsearch-specification repository, operations: esql-async-query
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { esql_async_query_request, esql_async_query_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ESQL_ASYNC_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.esql.async_query',
  connectorGroup: 'internal',
  summary: `Run an async ES|QL query`,
  description: `Run an async ES|QL query.

Asynchronously run an ES|QL (Elasticsearch query language) query, monitor its progress, and retrieve results when they become available.

The API accepts the same parameters and request body as the synchronous query API, along with additional async related properties.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query`,
  methods: ['POST'],
  patterns: ['_query/async'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['allow_partial_results', 'delimiter', 'drop_null_columns', 'format'],
    bodyParams: [
      'columnar',
      'filter',
      'locale',
      'params',
      'profile',
      'query',
      'tables',
      'include_ccs_metadata',
      'include_execution_metadata',
      'wait_for_completion_timeout',
      'keep_alive',
      'keep_on_completion',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(esql_async_query_request, 'body'),
    ...getShapeAt(esql_async_query_request, 'path'),
    ...getShapeAt(esql_async_query_request, 'query'),
  }),
  outputSchema: esql_async_query_response,
};
