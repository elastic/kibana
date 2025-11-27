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
 * Generated at: 2025-11-27T07:43:24.919Z
 * Source: elasticsearch-specification repository, operations: slm-get-stats
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { slm_get_stats_request, slm_get_stats_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SLM_GET_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.get_stats',
  connectorGroup: 'internal',
  summary: `Get snapshot lifecycle management statistics`,
  description: `Get snapshot lifecycle management statistics.

Get global and policy-level statistics about actions taken by snapshot lifecycle management.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-get-stats`,
  methods: ['GET'],
  patterns: ['_slm/stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-get-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(slm_get_stats_request, 'body'),
    ...getShapeAt(slm_get_stats_request, 'path'),
    ...getShapeAt(slm_get_stats_request, 'query'),
  }),
  outputSchema: slm_get_stats_response,
};
