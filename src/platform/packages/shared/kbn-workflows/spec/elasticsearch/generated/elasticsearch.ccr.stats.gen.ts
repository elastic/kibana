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
 * Generated at: 2025-11-27T07:04:28.191Z
 * Source: elasticsearch-specification repository, operations: ccr-stats
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ccr_stats_request, ccr_stats_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CCR_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.stats',
  connectorGroup: 'internal',
  summary: `Get cross-cluster replication stats`,
  description: `Get cross-cluster replication stats.

This API returns stats about auto-following and the same shard-level stats as the get follower stats API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-stats`,
  methods: ['GET'],
  patterns: ['_ccr/stats'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ccr_stats_request, 'body'),
    ...getShapeAt(ccr_stats_request, 'path'),
    ...getShapeAt(ccr_stats_request, 'query'),
  }),
  outputSchema: ccr_stats_response,
};
