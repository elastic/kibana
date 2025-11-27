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
 * Source: elasticsearch-specification repository, operations: sql-translate, sql-translate-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  sql_translate1_request,
  sql_translate1_response,
  sql_translate_request,
  sql_translate_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SQL_TRANSLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.sql.translate',
  connectorGroup: 'internal',
  summary: `Translate SQL into Elasticsearch queries`,
  description: `Translate SQL into Elasticsearch queries.

Translate an SQL search into a search API request containing Query DSL.
It accepts the same request body parameters as the SQL search API, excluding \`cursor\`.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-translate`,
  methods: ['POST', 'GET'],
  patterns: ['_sql/translate'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-translate',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['fetch_size', 'filter', 'query', 'time_zone'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(sql_translate_request, 'body'),
      ...getShapeAt(sql_translate_request, 'path'),
      ...getShapeAt(sql_translate_request, 'query'),
    }),
    z.object({
      ...getShapeAt(sql_translate1_request, 'body'),
      ...getShapeAt(sql_translate1_request, 'path'),
      ...getShapeAt(sql_translate1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([sql_translate_response, sql_translate1_response]),
};
