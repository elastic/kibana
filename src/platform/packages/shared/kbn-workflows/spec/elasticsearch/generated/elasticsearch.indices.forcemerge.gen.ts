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
 * Generated at: 2025-11-27T07:43:24.876Z
 * Source: elasticsearch-specification repository, operations: indices-forcemerge, indices-forcemerge-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_forcemerge1_request,
  indices_forcemerge1_response,
  indices_forcemerge_request,
  indices_forcemerge_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_FORCEMERGE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.forcemerge',
  connectorGroup: 'internal',
  summary: `Force a merge`,
  description: `Force a merge.

Perform the force merge operation on the shards of one or more indices.
For data streams, the API forces a merge on the shards of the stream's backing indices.

Merging reduces the number of segments in each shard by merging some of them together and also frees up the space used by deleted documents.
Merging normally happens automatically, but sometimes it is useful to trigger a merge manually.

WARNING: We recommend force merging only a read-only index (meaning the index is no longer receiving writes).
When documents are updated or deleted, the old version is not immediately removed but instead soft-deleted and marked with a "tombstone".
These soft-deleted documents are automatically cleaned up during regular segment merges.
But force merge can cause very large (greater than 5 GB) segments to be produced, which are not eligible for regular merges.
So the number of soft-deleted documents can then grow rapidly, resulting in higher disk usage and worse search performance.
If you regularly force merge an index receiving writes, this can also make snapshots more expensive, since the new documents can't be backed up incrementally.

**Blocks during a force merge**

Calls to this API block until the merge is complete (unless request contains \`wait_for_completion=false\`).
If the client connection is lost before completion then the force merge process will continue in the background.
Any new requests to force merge the same indices will also block until the ongoing force merge is complete.

**Running force merge asynchronously**

If the request contains \`wait_for_completion=false\`, Elasticsearch performs some preflight checks, launches the request, and returns a task you can use to get the status of the task.
However, you can not cancel this task as the force merge task is not cancelable.
Elasticsearch creates a record of this task as a document at \`_tasks/<task_id>\`.
When you are done with a task, you should delete the task document so Elasticsearch can reclaim the space.

**Force merging multiple indices**

You can force merge multiple indices with a single request by targeting:

* One or more data streams that contain multiple backing indices
* Multiple indices
* One or more aliases
* All data streams and indices in a cluster

Each targeted shard is force-merged separately using the force_merge threadpool.
By default each node only has a single \`force_merge\` thread which means that the shards on that node are force-merged one at a time.
If you expand the \`force_merge\` threadpool on a node then it will force merge its shards in parallel

Force merge makes the storage for the shard being merged temporarily increase, as it may require free space up to triple its size in case \`max_num_segments parameter\` is set to \`1\`, to rewrite all segments into a new one.

**Data streams and time-based indices**

Force-merging is useful for managing a data stream's older backing indices and other time-based indices, particularly after a rollover.
In these cases, each index only receives indexing traffic for a certain period of time.
Once an index receive no more writes, its shards can be force-merged to a single segment.
This can be a good idea because single-segment shards can sometimes use simpler and more efficient data structures to perform searches.
For example:

\`\`\`
POST /.ds-my-data-stream-2099.03.07-000001/_forcemerge?max_num_segments=1
\`\`\`

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-forcemerge`,
  methods: ['POST'],
  patterns: ['_forcemerge', '{index}/_forcemerge'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-forcemerge',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'flush',
      'ignore_unavailable',
      'max_num_segments',
      'only_expunge_deletes',
      'wait_for_completion',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_forcemerge_request, 'body'),
      ...getShapeAt(indices_forcemerge_request, 'path'),
      ...getShapeAt(indices_forcemerge_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_forcemerge1_request, 'body'),
      ...getShapeAt(indices_forcemerge1_request, 'path'),
      ...getShapeAt(indices_forcemerge1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_forcemerge_response, indices_forcemerge1_response]),
};
