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
 * Generated at: 2025-11-27T07:43:24.866Z
 * Source: elasticsearch-specification repository, operations: count, count-1, count-2, count-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  count1_request,
  count1_response,
  count2_request,
  count2_response,
  count3_request,
  count3_response,
  count_request,
  count_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const COUNT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.count',
  connectorGroup: 'internal',
  summary: `Count search results`,
  description: `Count search results.

Get the number of documents matching a query.

The query can be provided either by using a simple query string as a parameter, or by defining Query DSL within the request body.
The query is optional. When no query is provided, the API uses \`match_all\` to count all the documents.

The count API supports multi-target syntax. You can run a single count API search across multiple data streams and indices.

The operation is broadcast across all shards.
For each shard ID group, a replica is chosen and the search is run against it.
This means that replicas increase the scalability of the count.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-count`,
  methods: ['POST', 'GET'],
  patterns: ['_count', '{index}/_count'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-count',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'analyzer',
      'analyze_wildcard',
      'default_operator',
      'df',
      'expand_wildcards',
      'ignore_throttled',
      'ignore_unavailable',
      'lenient',
      'min_score',
      'preference',
      'routing',
      'terminate_after',
      'q',
    ],
    bodyParams: ['query'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(count_request, 'body'),
      ...getShapeAt(count_request, 'path'),
      ...getShapeAt(count_request, 'query'),
    }),
    z.object({
      ...getShapeAt(count1_request, 'body'),
      ...getShapeAt(count1_request, 'path'),
      ...getShapeAt(count1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(count2_request, 'body'),
      ...getShapeAt(count2_request, 'path'),
      ...getShapeAt(count2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(count3_request, 'body'),
      ...getShapeAt(count3_request, 'path'),
      ...getShapeAt(count3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([count_response, count1_response, count2_response, count3_response]),
};
