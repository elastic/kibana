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
 * Source: elasticsearch-specification repository, operations: cluster-post-voting-config-exclusions
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { cluster_post_voting_config_exclusions_request } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_POST_VOTING_CONFIG_EXCLUSIONS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.post_voting_config_exclusions',
  summary: `Update voting configuration exclusions`,
  description: `Update voting configuration exclusions.

Update the cluster voting config exclusions by node IDs or node names.
By default, if there are more than three master-eligible nodes in the cluster and you remove fewer than half of the master-eligible nodes in the cluster at once, the voting configuration automatically shrinks.
If you want to shrink the voting configuration to contain fewer than three nodes or to remove half or more of the master-eligible nodes in the cluster at once, use this API to remove departing nodes from the voting configuration manually.
The API adds an entry for each specified node to the cluster’s voting configuration exclusions list.
It then waits until the cluster has reconfigured its voting configuration to exclude the specified nodes.

Clusters should have no voting configuration exclusions in normal operation.
Once the excluded nodes have stopped, clear the voting configuration exclusions with \`DELETE /_cluster/voting_config_exclusions\`.
This API waits for the nodes to be fully removed from the cluster before it returns.
If your cluster has voting configuration exclusions for nodes that you no longer intend to remove, use \`DELETE /_cluster/voting_config_exclusions?wait_for_removal=false\` to clear the voting configuration exclusions without waiting for the nodes to leave the cluster.

A response to \`POST /_cluster/voting_config_exclusions\` with an HTTP status code of 200 OK guarantees that the node has been removed from the voting configuration and will not be reinstated until the voting configuration exclusions are cleared by calling \`DELETE /_cluster/voting_config_exclusions\`.
If the call to \`POST /_cluster/voting_config_exclusions\` fails or returns a response with an HTTP status code other than 200 OK then the node may not have been removed from the voting configuration.
In that case, you may safely retry the call.

NOTE: Voting exclusions are required only when you remove at least half of the master-eligible nodes from a cluster in a short time period.
They are not required when removing master-ineligible nodes or when removing fewer than half of the master-eligible nodes.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-post-voting-config-exclusions`,
  methods: ['POST'],
  patterns: ['_cluster/voting_config_exclusions'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-post-voting-config-exclusions',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['node_names', 'node_ids', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cluster_post_voting_config_exclusions_request, 'body'),
    ...getShapeAt(cluster_post_voting_config_exclusions_request, 'path'),
    ...getShapeAt(cluster_post_voting_config_exclusions_request, 'query'),
  }),
  outputSchema: z.optional(z.looseObject({})),
};
