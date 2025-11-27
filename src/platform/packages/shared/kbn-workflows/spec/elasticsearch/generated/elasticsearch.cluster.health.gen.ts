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
 * Generated at: 2025-11-27T07:04:28.195Z
 * Source: elasticsearch-specification repository, operations: cluster-health, cluster-health-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cluster_health1_request,
  cluster_health1_response,
  cluster_health_request,
  cluster_health_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_HEALTH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.health',
  connectorGroup: 'internal',
  summary: `Get the cluster health status`,
  description: `Get the cluster health status.

You can also use the API to get the health status of only specified data streams and indices.
For data streams, the API retrieves the health status of the stream’s backing indices.

The cluster health status is: green, yellow or red.
On the shard level, a red status indicates that the specific shard is not allocated in the cluster. Yellow means that the primary shard is allocated but replicas are not. Green means that all shards are allocated.
The index level status is controlled by the worst shard status.

One of the main benefits of the API is the ability to wait until the cluster reaches a certain high watermark health level.
The cluster status is controlled by the worst index status.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-health`,
  methods: ['GET'],
  patterns: ['_cluster/health', '_cluster/health/{index}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-health',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'expand_wildcards',
      'level',
      'local',
      'master_timeout',
      'timeout',
      'wait_for_active_shards',
      'wait_for_events',
      'wait_for_nodes',
      'wait_for_no_initializing_shards',
      'wait_for_no_relocating_shards',
      'wait_for_status',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cluster_health_request, 'body'),
      ...getShapeAt(cluster_health_request, 'path'),
      ...getShapeAt(cluster_health_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cluster_health1_request, 'body'),
      ...getShapeAt(cluster_health1_request, 'path'),
      ...getShapeAt(cluster_health1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cluster_health_response, cluster_health1_response]),
};
