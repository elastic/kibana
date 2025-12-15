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
 * Source: elasticsearch-specification repository, operations: msearch, msearch-1, msearch-2, msearch-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  msearch1_request,
  msearch1_response,
  msearch2_request,
  msearch2_response,
  msearch3_request,
  msearch3_response,
  msearch_request,
  msearch_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const MSEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.msearch',
  summary: `Run multiple searches`,
  description: `Run multiple searches.

The format of the request is similar to the bulk API format and makes use of the newline delimited JSON (NDJSON) format.
The structure is as follows:

\`\`\`
header\\n
body\\n
header\\n
body\\n
\`\`\`

This structure is specifically optimized to reduce parsing if a specific search ends up redirected to another node.

IMPORTANT: The final line of data must end with a newline character \`\\n\`.
Each newline character may be preceded by a carriage return \`\\r\`.
When sending requests to this endpoint the \`Content-Type\` header should be set to \`application/x-ndjson\`.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-msearch`,
  methods: ['GET', 'POST'],
  patterns: ['_msearch', '{index}/_msearch'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-msearch',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'ccs_minimize_roundtrips',
      'expand_wildcards',
      'ignore_throttled',
      'ignore_unavailable',
      'include_named_queries_score',
      'index',
      'max_concurrent_searches',
      'max_concurrent_shard_requests',
      'pre_filter_shard_size',
      'rest_total_hits_as_int',
      'routing',
      'search_type',
      'typed_keys',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(msearch_request, 'body'),
      ...getShapeAt(msearch_request, 'path'),
      ...getShapeAt(msearch_request, 'query'),
    }),
    z.object({
      ...getShapeAt(msearch1_request, 'body'),
      ...getShapeAt(msearch1_request, 'path'),
      ...getShapeAt(msearch1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(msearch2_request, 'body'),
      ...getShapeAt(msearch2_request, 'path'),
      ...getShapeAt(msearch2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(msearch3_request, 'body'),
      ...getShapeAt(msearch3_request, 'path'),
      ...getShapeAt(msearch3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    msearch_response,
    msearch1_response,
    msearch2_response,
    msearch3_response,
  ]),
};
