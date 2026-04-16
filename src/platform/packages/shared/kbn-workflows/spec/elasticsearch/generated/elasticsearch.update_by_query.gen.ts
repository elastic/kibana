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
 * Source: elasticsearch-specification repository, operations: update-by-query
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { update_by_query_request, update_by_query_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const UPDATE_BY_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.update_by_query',
  summary: `Update documents`,
  description: `Update documents.

Updates documents that match the specified query.
If no query is specified, performs an update on every document in the data stream or index without modifying the source, which is useful for picking up mapping changes.

If the Elasticsearch security features are enabled, you must have the following index privileges for the target data stream, index, or alias:

* \`read\`
* \`index\` or \`write\`

You can specify the query criteria in the request URI or the request body using the same syntax as the search API.

When you submit an update by query request, Elasticsearch gets a snapshot of the data stream or index when it begins processing the request and updates matching documents using internal versioning.
When the versions match, the document is updated and the version number is incremented.
If a document changes between the time that the snapshot is taken and the update operation is processed, it results in a version conflict and the operation fails.
You can opt to count version conflicts instead of halting and returning by setting \`conflicts\` to \`proceed\`.
Note that if you opt to count version conflicts, the operation could attempt to update more documents from the source than \`max_docs\` until it has successfully updated \`max_docs\` documents or it has gone through every document in the source query.

NOTE: Documents with a version equal to 0 cannot be updated using update by query because internal versioning does not support 0 as a valid version number.

While processing an update by query request, Elasticsearch performs multiple search requests sequentially to find all of the matching documents.
A bulk update request is performed for each batch of matching documents.
Any query or update failures cause the update by query request to fail and the failures are shown in the response.
Any update requests that completed successfully still stick, they are not rolled back.

**Refreshing shards**

Specifying the \`refresh\` parameter refreshes all shards once the request completes.
This is different to the update API's \`refresh\` parameter, which causes only the shard
that received the request to be refreshed. Unlike the update API, it does not support
\`wait_for\`.

**Running update by query asynchronously**

If the request contains \`wait_for_completion=false\`, Elasticsearch
performs some preflight checks, launches the request, and returns a
[task](https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-tasks) you can use to cancel or get the status of the task.
Elasticsearch creates a record of this task as a document at \`.tasks/task/\${taskId}\`.

**Waiting for active shards**

\`wait_for_active_shards\` controls how many copies of a shard must be active
before proceeding with the request. See [\`wait_for_active_shards\`](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-create#operation-create-wait_for_active_shards)
for details. \`timeout\` controls how long each write request waits for unavailable
shards to become available. Both work exactly the way they work in the
[Bulk API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk). Update by query uses scrolled searches, so you can also
specify the \`scroll\` parameter to control how long it keeps the search context
alive, for example \`?scroll=10m\`. The default is 5 minutes.

**Throttling update requests**

To control the rate at which update by query issues batches of update operations, you can set \`requests_per_second\` to any positive decimal number.
This pads each batch with a wait time to throttle the rate.
Set \`requests_per_second\` to \`-1\` to turn off throttling.

Throttling uses a wait time between batches so that the internal scroll requests can be given a timeout that takes the request padding into account.
The padding time is the difference between the batch size divided by the \`requests_per_second\` and the time spent writing.
By default the batch size is 1000, so if \`requests_per_second\` is set to \`500\`:

\`\`\`
target_time = 1000 / 500 per second = 2 seconds
wait_time = target_time - write_time = 2 seconds - .5 seconds = 1.5 seconds
\`\`\`

Since the batch is issued as a single _bulk request, large batch sizes cause Elasticsearch to create many requests and wait before starting the next set.
This is "bursty" instead of "smooth".

**Slicing**

Update by query supports sliced scroll to parallelize the update process.
This can improve efficiency and provide a convenient way to break the request down into smaller parts.

Setting \`slices\` to \`auto\` chooses a reasonable number for most data streams and indices.
This setting will use one slice per shard, up to a certain limit.
If there are multiple source data streams or indices, it will choose the number of slices based on the index or backing index with the smallest number of shards.

Adding \`slices\` to \`_update_by_query\` just automates the manual process of creating sub-requests, which means it has some quirks:

* You can see these requests in the tasks APIs. These sub-requests are "child" tasks of the task for the request with slices.
* Fetching the status of the task for the request with \`slices\` only contains the status of completed slices.
* These sub-requests are individually addressable for things like cancellation and rethrottling.
* Rethrottling the request with \`slices\` will rethrottle the unfinished sub-request proportionally.
* Canceling the request with slices will cancel each sub-request.
* Due to the nature of slices each sub-request won't get a perfectly even portion of the documents. All documents will be addressed, but some slices may be larger than others. Expect larger slices to have a more even distribution.
* Parameters like \`requests_per_second\` and \`max_docs\` on a request with slices are distributed proportionally to each sub-request. Combine that with the point above about distribution being uneven and you should conclude that using \`max_docs\` with \`slices\` might not result in exactly \`max_docs\` documents being updated.
* Each sub-request gets a slightly different snapshot of the source data stream or index though these are all taken at approximately the same time.

If you're slicing manually or otherwise tuning automatic slicing, keep in mind that:

* Query performance is most efficient when the number of slices is equal to the number of shards in the index or backing index. If that number is large (for example, 500), choose a lower number as too many slices hurts performance. Setting slices higher than the number of shards generally does not improve efficiency and adds overhead.
* Update performance scales linearly across available resources with the number of slices.

Whether query or update performance dominates the runtime depends on the documents being reindexed and cluster resources.
Refer to the linked documentation for examples of how to update documents using the \`_update_by_query\` API:

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update-by-query`,
  methods: ['POST'],
  patterns: ['{index}/_update_by_query'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update-by-query',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'analyzer',
      'analyze_wildcard',
      'conflicts',
      'default_operator',
      'df',
      'expand_wildcards',
      'from',
      'ignore_unavailable',
      'lenient',
      'max_docs',
      'pipeline',
      'preference',
      'q',
      'refresh',
      'request_cache',
      'requests_per_second',
      'routing',
      'scroll',
      'scroll_size',
      'search_timeout',
      'search_type',
      'slices',
      'sort',
      'stats',
      'terminate_after',
      'timeout',
      'version',
      'version_type',
      'wait_for_active_shards',
      'wait_for_completion',
    ],
    bodyParams: ['max_docs', 'query', 'script', 'slice', 'conflicts'],
  },
  paramsSchema: z.object({
    ...getShapeAt(update_by_query_request, 'body'),
    ...getShapeAt(update_by_query_request, 'path'),
    ...getShapeAt(update_by_query_request, 'query'),
  }),
  outputSchema: update_by_query_response,
};
