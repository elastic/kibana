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
 * Source: elasticsearch-specification repository, operations: nodes-stats, nodes-stats-1, nodes-stats-2, nodes-stats-3, nodes-stats-4, nodes-stats-5
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  nodes_stats1_request,
  nodes_stats1_response,
  nodes_stats2_request,
  nodes_stats2_response,
  nodes_stats3_request,
  nodes_stats3_response,
  nodes_stats4_request,
  nodes_stats4_response,
  nodes_stats5_request,
  nodes_stats5_response,
  nodes_stats_request,
  nodes_stats_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const NODES_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.nodes.stats',
  summary: `Get node statistics`,
  description: `Get node statistics.

Get statistics for nodes in a cluster.
By default, all stats are returned. You can limit the returned information by using metrics.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-stats`,
  methods: ['GET'],
  patterns: [
    '_nodes/stats',
    '_nodes/{node_id}/stats',
    '_nodes/stats/{metric}',
    '_nodes/{node_id}/stats/{metric}',
    '_nodes/stats/{metric}/{index_metric}',
    '_nodes/{node_id}/stats/{metric}/{index_metric}',
  ],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: ['node_id', 'metric', 'index_metric'],
    urlParams: [
      'completion_fields',
      'fielddata_fields',
      'fields',
      'groups',
      'include_segment_file_sizes',
      'level',
      'timeout',
      'types',
      'include_unloaded_segments',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(nodes_stats_request, 'body'),
      ...getShapeAt(nodes_stats_request, 'path'),
      ...getShapeAt(nodes_stats_request, 'query'),
    }),
    z.object({
      ...getShapeAt(nodes_stats1_request, 'body'),
      ...getShapeAt(nodes_stats1_request, 'path'),
      ...getShapeAt(nodes_stats1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(nodes_stats2_request, 'body'),
      ...getShapeAt(nodes_stats2_request, 'path'),
      ...getShapeAt(nodes_stats2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(nodes_stats3_request, 'body'),
      ...getShapeAt(nodes_stats3_request, 'path'),
      ...getShapeAt(nodes_stats3_request, 'query'),
    }),
    z.object({
      ...getShapeAt(nodes_stats4_request, 'body'),
      ...getShapeAt(nodes_stats4_request, 'path'),
      ...getShapeAt(nodes_stats4_request, 'query'),
    }),
    z.object({
      ...getShapeAt(nodes_stats5_request, 'body'),
      ...getShapeAt(nodes_stats5_request, 'path'),
      ...getShapeAt(nodes_stats5_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    nodes_stats_response,
    nodes_stats1_response,
    nodes_stats2_response,
    nodes_stats3_response,
    nodes_stats4_response,
    nodes_stats5_response,
  ]),
};
