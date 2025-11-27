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
 * Source: elasticsearch-specification repository, operations: sql-get-async
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { sql_get_async_request, sql_get_async_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SQL_GET_ASYNC_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.sql.get_async',
  connectorGroup: 'internal',
  summary: `Get async SQL search results`,
  description: `Get async SQL search results.

Get the current status and available results for an async SQL search or stored synchronous SQL search.

If the Elasticsearch security features are enabled, only the user who first submitted the SQL search can retrieve the search using this API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-get-async`,
  methods: ['GET'],
  patterns: ['_sql/async/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-get-async',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['delimiter', 'format', 'keep_alive', 'wait_for_completion_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(sql_get_async_request, 'body'),
    ...getShapeAt(sql_get_async_request, 'path'),
    ...getShapeAt(sql_get_async_request, 'query'),
  }),
  outputSchema: sql_get_async_response,
};
