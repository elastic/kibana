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
 * Generated at: 2025-11-27T07:43:24.907Z
 * Source: elasticsearch-specification repository, operations: rollup-rollup-search, rollup-rollup-search-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  rollup_rollup_search1_request,
  rollup_rollup_search1_response,
  rollup_rollup_search_request,
  rollup_rollup_search_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ROLLUP_ROLLUP_SEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.rollup_search',
  connectorGroup: 'internal',
  summary: `Search rolled-up data`,
  description: `Search rolled-up data.

The rollup search endpoint is needed because, internally, rolled-up documents utilize a different document structure than the original data.
It rewrites standard Query DSL into a format that matches the rollup documents then takes the response and rewrites it back to what a client would expect given the original query.

The request body supports a subset of features from the regular search API.
The following functionality is not available:

\`size\`: Because rollups work on pre-aggregated data, no search hits can be returned and so size must be set to zero or omitted entirely.
\`highlighter\`, \`suggestors\`, \`post_filter\`, \`profile\`, \`explain\`: These are similarly disallowed.

For more detailed examples of using the rollup search API, including querying rolled-up data only or combining rolled-up and live data, refer to the External documentation.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-rollup-search`,
  methods: ['GET', 'POST'],
  patterns: ['{index}/_rollup_search'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-rollup-search',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['rest_total_hits_as_int', 'typed_keys'],
    bodyParams: ['aggregations', 'query', 'size'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(rollup_rollup_search_request, 'body'),
      ...getShapeAt(rollup_rollup_search_request, 'path'),
      ...getShapeAt(rollup_rollup_search_request, 'query'),
    }),
    z.object({
      ...getShapeAt(rollup_rollup_search1_request, 'body'),
      ...getShapeAt(rollup_rollup_search1_request, 'path'),
      ...getShapeAt(rollup_rollup_search1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([rollup_rollup_search_response, rollup_rollup_search1_response]),
};
