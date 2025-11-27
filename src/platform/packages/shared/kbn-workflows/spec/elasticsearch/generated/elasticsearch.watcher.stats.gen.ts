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
 * Generated at: 2025-11-27T07:43:24.927Z
 * Source: elasticsearch-specification repository, operations: watcher-stats, watcher-stats-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  watcher_stats1_request,
  watcher_stats1_response,
  watcher_stats_request,
  watcher_stats_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const WATCHER_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.stats',
  connectorGroup: 'internal',
  summary: `Get Watcher statistics`,
  description: `Get Watcher statistics.

This API always returns basic metrics.
You retrieve more metrics by using the metric parameter.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-stats`,
  methods: ['GET'],
  patterns: ['_watcher/stats', '_watcher/stats/{metric}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: ['metric'],
    urlParams: ['emit_stacktraces', 'metric'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(watcher_stats_request, 'body'),
      ...getShapeAt(watcher_stats_request, 'path'),
      ...getShapeAt(watcher_stats_request, 'query'),
    }),
    z.object({
      ...getShapeAt(watcher_stats1_request, 'body'),
      ...getShapeAt(watcher_stats1_request, 'path'),
      ...getShapeAt(watcher_stats1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([watcher_stats_response, watcher_stats1_response]),
};
