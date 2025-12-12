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
 * Source: elasticsearch-specification repository, operations: cluster-stats, cluster-stats-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cluster_stats1_request,
  cluster_stats1_response,
  cluster_stats_request,
  cluster_stats_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.stats',
  summary: `Get cluster statistics`,
  description: `Get cluster statistics.

Get basic index metrics (shard numbers, store size, memory usage) and information about the current nodes that form the cluster (number, roles, os, jvm versions, memory usage, cpu and installed plugins).

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-stats`,
  methods: ['GET'],
  patterns: ['_cluster/stats', '_cluster/stats/nodes/{node_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: ['node_id'],
    urlParams: ['include_remotes', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cluster_stats_request, 'body'),
      ...getShapeAt(cluster_stats_request, 'path'),
      ...getShapeAt(cluster_stats_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cluster_stats1_request, 'body'),
      ...getShapeAt(cluster_stats1_request, 'path'),
      ...getShapeAt(cluster_stats1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cluster_stats_response, cluster_stats1_response]),
};
