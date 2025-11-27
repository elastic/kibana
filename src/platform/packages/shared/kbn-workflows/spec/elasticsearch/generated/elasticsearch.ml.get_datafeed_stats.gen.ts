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
 * Generated at: 2025-11-27T07:43:24.898Z
 * Source: elasticsearch-specification repository, operations: ml-get-datafeed-stats, ml-get-datafeed-stats-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_datafeed_stats1_request,
  ml_get_datafeed_stats1_response,
  ml_get_datafeed_stats_request,
  ml_get_datafeed_stats_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_DATAFEED_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_datafeed_stats',
  connectorGroup: 'internal',
  summary: `Get datafeed stats`,
  description: `Get datafeed stats.

You can get statistics for multiple datafeeds in a single API request by
using a comma-separated list of datafeeds or a wildcard expression. You can
get statistics for all datafeeds by using \`_all\`, by specifying \`*\` as the
\`<feed_id>\`, or by omitting the \`<feed_id>\`. If the datafeed is stopped, the
only information you receive is the \`datafeed_id\` and the \`state\`.
This API returns a maximum of 10,000 datafeeds.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-datafeed-stats`,
  methods: ['GET'],
  patterns: ['_ml/datafeeds/{datafeed_id}/_stats', '_ml/datafeeds/_stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-datafeed-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: ['datafeed_id'],
    urlParams: ['allow_no_match'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_get_datafeed_stats_request, 'body'),
      ...getShapeAt(ml_get_datafeed_stats_request, 'path'),
      ...getShapeAt(ml_get_datafeed_stats_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_datafeed_stats1_request, 'body'),
      ...getShapeAt(ml_get_datafeed_stats1_request, 'path'),
      ...getShapeAt(ml_get_datafeed_stats1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([ml_get_datafeed_stats_response, ml_get_datafeed_stats1_response]),
};
