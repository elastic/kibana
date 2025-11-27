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
 * Generated at: 2025-11-27T07:04:28.257Z
 * Source: elasticsearch-specification repository, operations: sql-get-async-status
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { sql_get_async_status_request, sql_get_async_status_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SQL_GET_ASYNC_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.sql.get_async_status',
  connectorGroup: 'internal',
  summary: `Get the async SQL search status`,
  description: `Get the async SQL search status.

Get the current status of an async SQL search or a stored synchronous SQL search.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-get-async-status`,
  methods: ['GET'],
  patterns: ['_sql/async/status/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-get-async-status',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(sql_get_async_status_request, 'body'),
    ...getShapeAt(sql_get_async_status_request, 'path'),
    ...getShapeAt(sql_get_async_status_request, 'query'),
  }),
  outputSchema: sql_get_async_status_response,
};
