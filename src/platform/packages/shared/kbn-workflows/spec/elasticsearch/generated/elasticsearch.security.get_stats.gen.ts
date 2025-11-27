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
 * Generated at: 2025-11-27T07:04:28.250Z
 * Source: elasticsearch-specification repository, operations: security-get-stats
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { security_get_stats_request, security_get_stats_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_GET_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_stats',
  connectorGroup: 'internal',
  summary: `Get security stats`,
  description: `Get security stats.

Gather security usage statistics from all node(s) within the cluster.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-stats`,
  methods: ['GET'],
  patterns: ['_security/stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_get_stats_request, 'body'),
    ...getShapeAt(security_get_stats_request, 'path'),
    ...getShapeAt(security_get_stats_request, 'query'),
  }),
  outputSchema: security_get_stats_response,
};
