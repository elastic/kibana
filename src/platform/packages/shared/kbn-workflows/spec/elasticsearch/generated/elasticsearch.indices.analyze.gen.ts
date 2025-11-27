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
 * Generated at: 2025-11-27T07:04:28.213Z
 * Source: elasticsearch-specification repository, operations: indices-analyze, indices-analyze-1, indices-analyze-2, indices-analyze-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_analyze1_request,
  indices_analyze1_response,
  indices_analyze2_request,
  indices_analyze2_response,
  indices_analyze3_request,
  indices_analyze3_response,
  indices_analyze_request,
  indices_analyze_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_ANALYZE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.analyze',
  connectorGroup: 'internal',
  summary: `Get tokens from text analysis`,
  description: `Get tokens from text analysis.

The analyze API performs analysis on a text string and returns the resulting tokens.

Generating excessive amount of tokens may cause a node to run out of memory.
The \`index.analyze.max_token_count\` setting enables you to limit the number of tokens that can be produced.
If more than this limit of tokens gets generated, an error occurs.
The \`_analyze\` endpoint without a specified index will always use \`10000\` as its limit.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-analyze`,
  methods: ['GET', 'POST'],
  patterns: ['_analyze', '{index}/_analyze'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-analyze',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['index'],
    bodyParams: [
      'analyzer',
      'attributes',
      'char_filter',
      'explain',
      'field',
      'filter',
      'normalizer',
      'text',
      'tokenizer',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_analyze_request, 'body'),
      ...getShapeAt(indices_analyze_request, 'path'),
      ...getShapeAt(indices_analyze_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_analyze1_request, 'body'),
      ...getShapeAt(indices_analyze1_request, 'path'),
      ...getShapeAt(indices_analyze1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_analyze2_request, 'body'),
      ...getShapeAt(indices_analyze2_request, 'path'),
      ...getShapeAt(indices_analyze2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_analyze3_request, 'body'),
      ...getShapeAt(indices_analyze3_request, 'path'),
      ...getShapeAt(indices_analyze3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    indices_analyze_response,
    indices_analyze1_response,
    indices_analyze2_response,
    indices_analyze3_response,
  ]),
};
