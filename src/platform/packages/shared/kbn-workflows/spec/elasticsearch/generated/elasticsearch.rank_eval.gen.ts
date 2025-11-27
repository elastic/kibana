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
 * Generated at: 2025-11-27T07:43:24.906Z
 * Source: elasticsearch-specification repository, operations: rank-eval, rank-eval-1, rank-eval-2, rank-eval-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  rank_eval1_request,
  rank_eval1_response,
  rank_eval2_request,
  rank_eval2_response,
  rank_eval3_request,
  rank_eval3_response,
  rank_eval_request,
  rank_eval_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const RANK_EVAL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rank_eval',
  connectorGroup: 'internal',
  summary: `Evaluate ranked search results`,
  description: `Evaluate ranked search results.

Evaluate the quality of ranked search results over a set of typical search queries.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rank-eval`,
  methods: ['GET', 'POST'],
  patterns: ['_rank_eval', '{index}/_rank_eval'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rank-eval',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['allow_no_indices', 'expand_wildcards', 'ignore_unavailable', 'search_type'],
    bodyParams: ['requests', 'metric'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(rank_eval_request, 'body'),
      ...getShapeAt(rank_eval_request, 'path'),
      ...getShapeAt(rank_eval_request, 'query'),
    }),
    z.object({
      ...getShapeAt(rank_eval1_request, 'body'),
      ...getShapeAt(rank_eval1_request, 'path'),
      ...getShapeAt(rank_eval1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(rank_eval2_request, 'body'),
      ...getShapeAt(rank_eval2_request, 'path'),
      ...getShapeAt(rank_eval2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(rank_eval3_request, 'body'),
      ...getShapeAt(rank_eval3_request, 'path'),
      ...getShapeAt(rank_eval3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    rank_eval_response,
    rank_eval1_response,
    rank_eval2_response,
    rank_eval3_response,
  ]),
};
