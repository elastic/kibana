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
 * Generated at: 2025-11-27T07:43:24.884Z
 * Source: elasticsearch-specification repository, operations: indices-stats, indices-stats-1, indices-stats-2, indices-stats-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_stats1_request,
  indices_stats1_response,
  indices_stats2_request,
  indices_stats2_response,
  indices_stats3_request,
  indices_stats3_response,
  indices_stats_request,
  indices_stats_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.stats',
  connectorGroup: 'internal',
  summary: `Get index statistics`,
  description: `Get index statistics.

For data streams, the API retrieves statistics for the stream's backing indices.

By default, the returned statistics are index-level with \`primaries\` and \`total\` aggregations.
\`primaries\` are the values for only the primary shards.
\`total\` are the accumulated values for both primary and replica shards.

To get shard-level statistics, set the \`level\` parameter to \`shards\`.

NOTE: When moving to another node, the shard-level statistics for a shard are cleared.
Although the shard is no longer part of the node, that node retains any node-level statistics to which the shard contributed.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-stats`,
  methods: ['GET'],
  patterns: ['_stats', '_stats/{metric}', '{index}/_stats', '{index}/_stats/{metric}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: ['metric', 'index'],
    urlParams: [
      'completion_fields',
      'expand_wildcards',
      'fielddata_fields',
      'fields',
      'forbid_closed_indices',
      'groups',
      'include_segment_file_sizes',
      'include_unloaded_segments',
      'level',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_stats_request, 'body'),
      ...getShapeAt(indices_stats_request, 'path'),
      ...getShapeAt(indices_stats_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_stats1_request, 'body'),
      ...getShapeAt(indices_stats1_request, 'path'),
      ...getShapeAt(indices_stats1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_stats2_request, 'body'),
      ...getShapeAt(indices_stats2_request, 'path'),
      ...getShapeAt(indices_stats2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_stats3_request, 'body'),
      ...getShapeAt(indices_stats3_request, 'path'),
      ...getShapeAt(indices_stats3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    indices_stats_response,
    indices_stats1_response,
    indices_stats2_response,
    indices_stats3_response,
  ]),
};
