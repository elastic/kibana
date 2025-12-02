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
 * Source: elasticsearch-specification repository, operations: esql-list-queries
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  esql_list_queries_request,
  esql_list_queries_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ESQL_LIST_QUERIES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.esql.list_queries',
  summary: `Get running ES|QL queries information`,
  description: `Get running ES|QL queries information.

Returns an object containing IDs and other information about the running ES|QL queries.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-list-queries`,
  methods: ['GET'],
  patterns: ['_query/queries'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-list-queries',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(esql_list_queries_request, 'body'),
    ...getShapeAt(esql_list_queries_request, 'path'),
    ...getShapeAt(esql_list_queries_request, 'query'),
  }),
  outputSchema: esql_list_queries_response,
};
