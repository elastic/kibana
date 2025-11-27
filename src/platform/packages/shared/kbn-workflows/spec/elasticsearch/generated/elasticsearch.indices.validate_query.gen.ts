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
 * Generated at: 2025-11-27T07:43:24.885Z
 * Source: elasticsearch-specification repository, operations: indices-validate-query, indices-validate-query-1, indices-validate-query-2, indices-validate-query-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_validate_query1_request,
  indices_validate_query1_response,
  indices_validate_query2_request,
  indices_validate_query2_response,
  indices_validate_query3_request,
  indices_validate_query3_response,
  indices_validate_query_request,
  indices_validate_query_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_VALIDATE_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.validate_query',
  connectorGroup: 'internal',
  summary: `Validate a query`,
  description: `Validate a query.

Validates a query without running it.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-validate-query`,
  methods: ['GET', 'POST'],
  patterns: ['_validate/query', '{index}/_validate/query'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-validate-query',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'all_shards',
      'analyzer',
      'analyze_wildcard',
      'default_operator',
      'df',
      'expand_wildcards',
      'explain',
      'ignore_unavailable',
      'lenient',
      'rewrite',
      'q',
    ],
    bodyParams: ['query'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_validate_query_request, 'body'),
      ...getShapeAt(indices_validate_query_request, 'path'),
      ...getShapeAt(indices_validate_query_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_validate_query1_request, 'body'),
      ...getShapeAt(indices_validate_query1_request, 'path'),
      ...getShapeAt(indices_validate_query1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_validate_query2_request, 'body'),
      ...getShapeAt(indices_validate_query2_request, 'path'),
      ...getShapeAt(indices_validate_query2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_validate_query3_request, 'body'),
      ...getShapeAt(indices_validate_query3_request, 'path'),
      ...getShapeAt(indices_validate_query3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    indices_validate_query_response,
    indices_validate_query1_response,
    indices_validate_query2_response,
    indices_validate_query3_response,
  ]),
};
