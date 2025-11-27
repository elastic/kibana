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
 * Generated at: 2025-11-27T07:43:24.909Z
 * Source: elasticsearch-specification repository, operations: searchable-snapshots-cache-stats, searchable-snapshots-cache-stats-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  searchable_snapshots_cache_stats1_request,
  searchable_snapshots_cache_stats1_response,
  searchable_snapshots_cache_stats_request,
  searchable_snapshots_cache_stats_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCHABLE_SNAPSHOTS_CACHE_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.searchable_snapshots.cache_stats',
  connectorGroup: 'internal',
  summary: `Get cache statistics`,
  description: `Get cache statistics.

Get statistics about the shared cache for partially mounted indices.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-cache-stats`,
  methods: ['GET'],
  patterns: ['_searchable_snapshots/cache/stats', '_searchable_snapshots/{node_id}/cache/stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-cache-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: ['node_id'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(searchable_snapshots_cache_stats_request, 'body'),
      ...getShapeAt(searchable_snapshots_cache_stats_request, 'path'),
      ...getShapeAt(searchable_snapshots_cache_stats_request, 'query'),
    }),
    z.object({
      ...getShapeAt(searchable_snapshots_cache_stats1_request, 'body'),
      ...getShapeAt(searchable_snapshots_cache_stats1_request, 'path'),
      ...getShapeAt(searchable_snapshots_cache_stats1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    searchable_snapshots_cache_stats_response,
    searchable_snapshots_cache_stats1_response,
  ]),
};
