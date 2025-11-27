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
 * Generated at: 2025-11-27T07:43:24.861Z
 * Source: elasticsearch-specification repository, operations: cluster-state, cluster-state-1, cluster-state-2
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cluster_state1_request,
  cluster_state1_response,
  cluster_state2_request,
  cluster_state2_response,
  cluster_state_request,
  cluster_state_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_STATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.state',
  connectorGroup: 'internal',
  summary: `Get the cluster state`,
  description: `Get the cluster state.

Get comprehensive information about the state of the cluster.

The cluster state is an internal data structure which keeps track of a variety of information needed by every node, including the identity and attributes of the other nodes in the cluster; cluster-wide settings; index metadata, including the mapping and settings for each index; the location and status of every shard copy in the cluster.

The elected master node ensures that every node in the cluster has a copy of the same cluster state.
This API lets you retrieve a representation of this internal state for debugging or diagnostic purposes.
You may need to consult the Elasticsearch source code to determine the precise meaning of the response.

By default the API will route requests to the elected master node since this node is the authoritative source of cluster states.
You can also retrieve the cluster state held on the node handling the API request by adding the \`?local=true\` query parameter.

Elasticsearch may need to expend significant effort to compute a response to this API in larger clusters, and the response may comprise a very large quantity of data.
If you use this API repeatedly, your cluster may become unstable.

WARNING: The response is a representation of an internal data structure.
Its format is not subject to the same compatibility guarantees as other more stable APIs and may change from version to version.
Do not query this API using external monitoring tools.
Instead, obtain the information you require using other more stable cluster APIs.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-state`,
  methods: ['GET'],
  patterns: ['_cluster/state', '_cluster/state/{metric}', '_cluster/state/{metric}/{index}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-state',
  parameterTypes: {
    headerParams: [],
    pathParams: ['metric', 'index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'flat_settings',
      'ignore_unavailable',
      'local',
      'master_timeout',
      'wait_for_metadata_version',
      'wait_for_timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cluster_state_request, 'body'),
      ...getShapeAt(cluster_state_request, 'path'),
      ...getShapeAt(cluster_state_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cluster_state1_request, 'body'),
      ...getShapeAt(cluster_state1_request, 'path'),
      ...getShapeAt(cluster_state1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cluster_state2_request, 'body'),
      ...getShapeAt(cluster_state2_request, 'path'),
      ...getShapeAt(cluster_state2_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cluster_state_response, cluster_state1_response, cluster_state2_response]),
};
