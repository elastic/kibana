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
 * Generated at: 2025-11-27T07:04:28.214Z
 * Source: elasticsearch-specification repository, operations: indices-clone, indices-clone-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_clone1_request,
  indices_clone1_response,
  indices_clone_request,
  indices_clone_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_CLONE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.clone',
  connectorGroup: 'internal',
  summary: `Clone an index`,
  description: `Clone an index.

Clone an existing index into a new index.
Each original primary shard is cloned into a new primary shard in the new index.

IMPORTANT: Elasticsearch does not apply index templates to the resulting index.
The API also does not copy index metadata from the original index.
Index metadata includes aliases, index lifecycle management phase definitions, and cross-cluster replication (CCR) follower information.
For example, if you clone a CCR follower index, the resulting clone will not be a follower index.

The clone API copies most index settings from the source index to the resulting index, with the exception of \`index.number_of_replicas\` and \`index.auto_expand_replicas\`.
To set the number of replicas in the resulting index, configure these settings in the clone request.

Cloning works as follows:

* First, it creates a new target index with the same definition as the source index.
* Then it hard-links segments from the source index into the target index. If the file system does not support hard-linking, all segments are copied into the new index, which is a much more time consuming process.
* Finally, it recovers the target index as though it were a closed index which had just been re-opened.

IMPORTANT: Indices can only be cloned if they meet the following requirements:

* The index must be marked as read-only and have a cluster health status of green.
* The target index must not exist.
* The source index must have the same number of primary shards as the target index.
* The node handling the clone process must have sufficient free disk space to accommodate a second copy of the existing index.

The current write index on a data stream cannot be cloned.
In order to clone the current write index, the data stream must first be rolled over so that a new write index is created and then the previous write index can be cloned.

NOTE: Mappings cannot be specified in the \`_clone\` request. The mappings of the source index will be used for the target index.

**Monitor the cloning process**

The cloning process can be monitored with the cat recovery API or the cluster health API can be used to wait until all primary shards have been allocated by setting the \`wait_for_status\` parameter to \`yellow\`.

The \`_clone\` API returns as soon as the target index has been added to the cluster state, before any shards have been allocated.
At this point, all shards are in the state unassigned.
If, for any reason, the target index can't be allocated, its primary shard will remain unassigned until it can be allocated on that node.

Once the primary shard is allocated, it moves to state initializing, and the clone process begins.
When the clone operation completes, the shard will become active.
At that point, Elasticsearch will try to allocate any replicas and may decide to relocate the primary shard to another node.

**Wait for active shards**

Because the clone operation creates a new index to clone the shards to, the wait for active shards setting on index creation applies to the clone index action as well.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-clone`,
  methods: ['PUT', 'POST'],
  patterns: ['{index}/_clone/{target}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-clone',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'target'],
    urlParams: ['master_timeout', 'timeout', 'wait_for_active_shards'],
    bodyParams: ['aliases', 'settings'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_clone_request, 'body'),
      ...getShapeAt(indices_clone_request, 'path'),
      ...getShapeAt(indices_clone_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_clone1_request, 'body'),
      ...getShapeAt(indices_clone1_request, 'path'),
      ...getShapeAt(indices_clone1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_clone_response, indices_clone1_response]),
};
