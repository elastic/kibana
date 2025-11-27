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
 * Generated at: 2025-11-27T07:43:24.860Z
 * Source: elasticsearch-specification repository, operations: cluster-allocation-explain, cluster-allocation-explain-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cluster_allocation_explain1_request,
  cluster_allocation_explain1_response,
  cluster_allocation_explain_request,
  cluster_allocation_explain_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_ALLOCATION_EXPLAIN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.allocation_explain',
  connectorGroup: 'internal',
  summary: `Explain the shard allocations`,
  description: `Explain the shard allocations.

Get explanations for shard allocations in the cluster.
This API accepts the current_node, index, primary and shard parameters in the request body or in query parameters, but not in both at the same time.
For unassigned shards, it provides an explanation for why the shard is unassigned.
For assigned shards, it provides an explanation for why the shard is remaining on its current node and has not moved or rebalanced to another node.
This API can be very useful when attempting to diagnose why a shard is unassigned or why a shard continues to remain on its current node when you might expect otherwise.
Refer to the linked documentation for examples of how to troubleshoot allocation issues using this API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-allocation-explain`,
  methods: ['GET', 'POST'],
  patterns: ['_cluster/allocation/explain'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-allocation-explain',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'index',
      'shard',
      'primary',
      'current_node',
      'include_disk_info',
      'include_yes_decisions',
      'master_timeout',
    ],
    bodyParams: ['index', 'shard', 'primary', 'current_node'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cluster_allocation_explain_request, 'body'),
      ...getShapeAt(cluster_allocation_explain_request, 'path'),
      ...getShapeAt(cluster_allocation_explain_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cluster_allocation_explain1_request, 'body'),
      ...getShapeAt(cluster_allocation_explain1_request, 'path'),
      ...getShapeAt(cluster_allocation_explain1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    cluster_allocation_explain_response,
    cluster_allocation_explain1_response,
  ]),
};
