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
 * Generated at: 2025-11-27T07:04:28.225Z
 * Source: elasticsearch-specification repository, operations: indices-shrink, indices-shrink-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_shrink1_request,
  indices_shrink1_response,
  indices_shrink_request,
  indices_shrink_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_SHRINK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.shrink',
  connectorGroup: 'internal',
  summary: `Shrink an index`,
  description: `Shrink an index.

Shrink an index into a new index with fewer primary shards.

Before you can shrink an index:

* The index must be read-only.
* A copy of every shard in the index must reside on the same node.
* The index must have a green health status.

To make shard allocation easier, we recommend you also remove the index's replica shards.
You can later re-add replica shards as part of the shrink operation.

The requested number of primary shards in the target index must be a factor of the number of shards in the source index.
For example an index with 8 primary shards can be shrunk into 4, 2 or 1 primary shards or an index with 15 primary shards can be shrunk into 5, 3 or 1.
If the number of shards in the index is a prime number it can only be shrunk into a single primary shard
 Before shrinking, a (primary or replica) copy of every shard in the index must be present on the same node.

The current write index on a data stream cannot be shrunk. In order to shrink the current write index, the data stream must first be rolled over so that a new write index is created and then the previous write index can be shrunk.

A shrink operation:

* Creates a new target index with the same definition as the source index, but with a smaller number of primary shards.
* Hard-links segments from the source index into the target index. If the file system does not support hard-linking, then all segments are copied into the new index, which is a much more time consuming process. Also if using multiple data paths, shards on different data paths require a full copy of segment files if they are not on the same disk since hardlinks do not work across disks.
* Recovers the target index as though it were a closed index which had just been re-opened. Recovers shards to the \`.routing.allocation.initial_recovery._id\` index setting.

IMPORTANT: Indices can only be shrunk if they satisfy the following requirements:

* The target index must not exist.
* The source index must have more primary shards than the target index.
* The number of primary shards in the target index must be a factor of the number of primary shards in the source index. The source index must have more primary shards than the target index.
* The index must not contain more than 2,147,483,519 documents in total across all shards that will be shrunk into a single shard on the target index as this is the maximum number of docs that can fit into a single shard.
* The node handling the shrink process must have sufficient free disk space to accommodate a second copy of the existing index.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-shrink`,
  methods: ['PUT', 'POST'],
  patterns: ['{index}/_shrink/{target}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-shrink',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'target'],
    urlParams: ['master_timeout', 'timeout', 'wait_for_active_shards'],
    bodyParams: ['aliases', 'settings'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_shrink_request, 'body'),
      ...getShapeAt(indices_shrink_request, 'path'),
      ...getShapeAt(indices_shrink_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_shrink1_request, 'body'),
      ...getShapeAt(indices_shrink1_request, 'path'),
      ...getShapeAt(indices_shrink1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_shrink_response, indices_shrink1_response]),
};
