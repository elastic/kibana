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
 * Generated at: 2025-11-27T07:04:28.197Z
 * Source: elasticsearch-specification repository, operations: cluster-reroute
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { cluster_reroute_request, cluster_reroute_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_REROUTE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.reroute',
  connectorGroup: 'internal',
  summary: `Reroute the cluster`,
  description: `Reroute the cluster.

Manually change the allocation of individual shards in the cluster.
For example, a shard can be moved from one node to another explicitly, an allocation can be canceled, and an unassigned shard can be explicitly allocated to a specific node.

It is important to note that after processing any reroute commands Elasticsearch will perform rebalancing as normal (respecting the values of settings such as \`cluster.routing.rebalance.enable\`) in order to remain in a balanced state.
For example, if the requested allocation includes moving a shard from node1 to node2 then this may cause a shard to be moved from node2 back to node1 to even things out.

The cluster can be set to disable allocations using the \`cluster.routing.allocation.enable\` setting.
If allocations are disabled then the only allocations that will be performed are explicit ones given using the reroute command, and consequent allocations due to rebalancing.

The cluster will attempt to allocate a shard a maximum of \`index.allocation.max_retries\` times in a row (defaults to \`5\`), before giving up and leaving the shard unallocated.
This scenario can be caused by structural problems such as having an analyzer which refers to a stopwords file which doesn’t exist on all nodes.

Once the problem has been corrected, allocation can be manually retried by calling the reroute API with the \`?retry_failed\` URI query parameter, which will attempt a single retry round for these shards.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-reroute`,
  methods: ['POST'],
  patterns: ['_cluster/reroute'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-reroute',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['dry_run', 'explain', 'metric', 'retry_failed', 'master_timeout', 'timeout'],
    bodyParams: ['commands'],
  },
  paramsSchema: z.object({
    ...getShapeAt(cluster_reroute_request, 'body'),
    ...getShapeAt(cluster_reroute_request, 'path'),
    ...getShapeAt(cluster_reroute_request, 'query'),
  }),
  outputSchema: cluster_reroute_response,
};
