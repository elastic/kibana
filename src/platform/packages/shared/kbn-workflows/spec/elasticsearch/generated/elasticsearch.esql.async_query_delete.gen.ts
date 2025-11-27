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
 * Generated at: 2025-11-27T07:04:28.208Z
 * Source: elasticsearch-specification repository, operations: esql-async-query-delete
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  esql_async_query_delete_request,
  esql_async_query_delete_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ESQL_ASYNC_QUERY_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.esql.async_query_delete',
  connectorGroup: 'internal',
  summary: `Delete an async ES|QL query`,
  description: `Delete an async ES|QL query.

If the query is still running, it is cancelled.
Otherwise, the stored results are deleted.

If the Elasticsearch security features are enabled, only the following users can use this API to delete a query:

* The authenticated user that submitted the original query request
* Users with the \`cancel_task\` cluster privilege

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query-delete`,
  methods: ['DELETE'],
  patterns: ['_query/async/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query-delete',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(esql_async_query_delete_request, 'body'),
    ...getShapeAt(esql_async_query_delete_request, 'path'),
    ...getShapeAt(esql_async_query_delete_request, 'query'),
  }),
  outputSchema: esql_async_query_delete_response,
};
