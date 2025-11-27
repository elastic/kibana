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
 * Source: elasticsearch-specification repository, operations: esql-async-query-stop
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  esql_async_query_stop_request,
  esql_async_query_stop_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ESQL_ASYNC_QUERY_STOP_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.esql.async_query_stop',
  connectorGroup: 'internal',
  summary: `Stop async ES|QL query`,
  description: `Stop async ES|QL query.

This API interrupts the query execution and returns the results so far.
If the Elasticsearch security features are enabled, only the user who first submitted the ES|QL query can stop it.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query-stop`,
  methods: ['POST'],
  patterns: ['_query/async/{id}/stop'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query-stop',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['drop_null_columns'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(esql_async_query_stop_request, 'body'),
    ...getShapeAt(esql_async_query_stop_request, 'path'),
    ...getShapeAt(esql_async_query_stop_request, 'query'),
  }),
  outputSchema: esql_async_query_stop_response,
};
