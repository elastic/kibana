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
 * Generated at: 2025-11-27T07:04:28.241Z
 * Source: elasticsearch-specification repository, operations: nodes-hot-threads, nodes-hot-threads-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  nodes_hot_threads1_request,
  nodes_hot_threads1_response,
  nodes_hot_threads_request,
  nodes_hot_threads_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const NODES_HOT_THREADS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.nodes.hot_threads',
  connectorGroup: 'internal',
  summary: `Get the hot threads for nodes`,
  description: `Get the hot threads for nodes.

Get a breakdown of the hot threads on each selected node in the cluster.
The output is plain text with a breakdown of the top hot threads for each node.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-hot-threads`,
  methods: ['GET'],
  patterns: ['_nodes/hot_threads', '_nodes/{node_id}/hot_threads'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-hot-threads',
  parameterTypes: {
    headerParams: [],
    pathParams: ['node_id'],
    urlParams: [
      'ignore_idle_threads',
      'interval',
      'snapshots',
      'threads',
      'timeout',
      'type',
      'sort',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(nodes_hot_threads_request, 'body'),
      ...getShapeAt(nodes_hot_threads_request, 'path'),
      ...getShapeAt(nodes_hot_threads_request, 'query'),
    }),
    z.object({
      ...getShapeAt(nodes_hot_threads1_request, 'body'),
      ...getShapeAt(nodes_hot_threads1_request, 'path'),
      ...getShapeAt(nodes_hot_threads1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([nodes_hot_threads_response, nodes_hot_threads1_response]),
};
