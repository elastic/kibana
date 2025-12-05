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
 * Source: elasticsearch-specification repository, operations: sql-delete-async
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { sql_delete_async_request, sql_delete_async_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SQL_DELETE_ASYNC_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.sql.delete_async',
  summary: `Delete an async SQL search`,
  description: `Delete an async SQL search.

Delete an async SQL search or a stored synchronous SQL search.
If the search is still running, the API cancels it.

If the Elasticsearch security features are enabled, only the following users can use this API to delete a search:

* Users with the \`cancel_task\` cluster privilege.
* The user who first submitted the search.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-delete-async`,
  methods: ['DELETE'],
  patterns: ['_sql/async/delete/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-delete-async',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(sql_delete_async_request, 'body'),
    ...getShapeAt(sql_delete_async_request, 'path'),
    ...getShapeAt(sql_delete_async_request, 'query'),
  }),
  outputSchema: sql_delete_async_response,
};
