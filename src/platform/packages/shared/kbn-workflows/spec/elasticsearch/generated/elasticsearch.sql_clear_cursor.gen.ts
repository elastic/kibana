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
 * Source: elasticsearch-specification repository, operations: sql-clear-cursor
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { sql_clear_cursor_request, sql_clear_cursor_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SQL_CLEAR_CURSOR_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.sql.clear_cursor',
  summary: `Clear an SQL search cursor`,
  description: `Clear an SQL search cursor.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-clear-cursor`,
  methods: ['POST'],
  patterns: ['_sql/close'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-clear-cursor',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['cursor'],
  },
  paramsSchema: z.object({
    ...getShapeAt(sql_clear_cursor_request, 'body'),
    ...getShapeAt(sql_clear_cursor_request, 'path'),
    ...getShapeAt(sql_clear_cursor_request, 'query'),
  }),
  outputSchema: sql_clear_cursor_response,
};
