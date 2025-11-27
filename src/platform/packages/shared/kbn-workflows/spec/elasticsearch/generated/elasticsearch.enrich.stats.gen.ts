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
 * Generated at: 2025-11-27T07:43:24.868Z
 * Source: elasticsearch-specification repository, operations: enrich-stats
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { enrich_stats_request, enrich_stats_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ENRICH_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.enrich.stats',
  connectorGroup: 'internal',
  summary: `Get enrich stats`,
  description: `Get enrich stats.

Returns enrich coordinator statistics and information about enrich policies that are currently executing.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-stats`,
  methods: ['GET'],
  patterns: ['_enrich/_stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(enrich_stats_request, 'body'),
    ...getShapeAt(enrich_stats_request, 'path'),
    ...getShapeAt(enrich_stats_request, 'query'),
  }),
  outputSchema: enrich_stats_response,
};
