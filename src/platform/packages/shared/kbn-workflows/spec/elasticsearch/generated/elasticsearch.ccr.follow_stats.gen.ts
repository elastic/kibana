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
 * Generated at: 2025-11-27T07:43:24.858Z
 * Source: elasticsearch-specification repository, operations: ccr-follow-stats
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ccr_follow_stats_request, ccr_follow_stats_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CCR_FOLLOW_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.follow_stats',
  connectorGroup: 'internal',
  summary: `Get follower stats`,
  description: `Get follower stats.

Get cross-cluster replication follower stats.
The API returns shard-level stats about the "following tasks" associated with each shard for the specified indices.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-follow-stats`,
  methods: ['GET'],
  patterns: ['{index}/_ccr/stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-follow-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ccr_follow_stats_request, 'body'),
    ...getShapeAt(ccr_follow_stats_request, 'path'),
    ...getShapeAt(ccr_follow_stats_request, 'query'),
  }),
  outputSchema: ccr_follow_stats_response,
};
