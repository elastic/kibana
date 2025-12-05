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
 * Source: elasticsearch-specification repository, operations: esql-async-query-get
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  esql_async_query_get_request,
  esql_async_query_get_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ESQL_ASYNC_QUERY_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.esql.async_query_get',
  summary: `Get async ES|QL query results`,
  description: `Get async ES|QL query results.

Get the current status and available results or stored results for an ES|QL asynchronous query.
If the Elasticsearch security features are enabled, only the user who first submitted the ES|QL query can retrieve the results using this API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query-get`,
  methods: ['GET'],
  patterns: ['_query/async/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query-get',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['drop_null_columns', 'format', 'keep_alive', 'wait_for_completion_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(esql_async_query_get_request, 'body'),
    ...getShapeAt(esql_async_query_get_request, 'path'),
    ...getShapeAt(esql_async_query_get_request, 'query'),
  }),
  outputSchema: esql_async_query_get_response,
};
