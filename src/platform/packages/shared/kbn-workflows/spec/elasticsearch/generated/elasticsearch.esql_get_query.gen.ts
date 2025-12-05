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
 * Source: elasticsearch-specification repository, operations: esql-get-query
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { esql_get_query_request, esql_get_query_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ESQL_GET_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.esql.get_query',
  summary: `Get a specific running ES|QL query information`,
  description: `Get a specific running ES|QL query information.

Returns an object extended information about a running ES|QL query.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-get-query`,
  methods: ['GET'],
  patterns: ['_query/queries/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-get-query',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(esql_get_query_request, 'body'),
    ...getShapeAt(esql_get_query_request, 'path'),
    ...getShapeAt(esql_get_query_request, 'query'),
  }),
  outputSchema: esql_get_query_response,
};
