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
 * Source: elasticsearch-specification repository, operations: delete-by-query
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { delete_by_query_request, delete_by_query_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const DELETE_BY_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.delete_by_query',
  summary: `Delete documents`,
  description: `Delete documents.

Deletes documents that match the specified query.

If the Elasticsearch security features are enabled, you must have the following index privileges for the target data stream, index, or alias:

* \`read\`
* \`delete\` or \`write\`

You can specify the query criteria in the request URI or the request body using the same syntax as the search API.
When you submit a delete by query request, Elasticsearch gets a snapshot of the data stream or index when it begins processing the request and deletes matching documents using internal versioning.
If a document changes between the time that the snapshot is taken and the delete operation is processed, it results in a version conflict and the delete operation fails.

NOTE: Documents with a version equal to 0 cannot be deleted using delete by query because internal versioning does not support 0 as a valid version number.

While processing a delete by query request, Elasticsearch performs multiple search requests sequentially to find all of the matching documents to delete.
A bulk delete request is performed for each batch of matching documents.
If a search or bulk request is rejected, the requests are retried up to 10 times, with exponential back off.
If the maximum retry limit is reached, processing halts and all failed requests are returned in the response.
Any delete requests that completed successfully still stick, they are not rolled back.

You can opt to count version conflicts instead of halting and returning by setting \`conflicts\` to \`proceed\`.
Note that if you opt to count version conflicts the operation could attempt to delete more documents from the source than \`max_docs\` until it has successfully deleted \`max_docs documents\`, or it has gone through every document in the source query.

**Throttling delete requests**

To control the rate at which delete by query issues batches of delete operations, you can set \`requests_per_second\` to any positive decimal number.
This pads each batch with a wait time to throttle the rate.
Set \`requests_per_second\` to \`-1\` to disable throttling.

Throttling uses a wait time between batches so that the internal scroll requests can be given a timeout that takes the request padding into account.
The padding time is the difference between the batch size divided by the \`requests_per_second\` and the time spent writing.
By default the batch size is \`1000\`, so if \`requests_per_second\` is set to \`500\`:

\`\`\`
target_time = 1000 / 500 per second = 2 seconds
wait_time = target_time - write_time = 2 seconds - .5 seconds = 1.5 seconds
\`\`\`

Since the batch is issued as a single \`_bulk\` request, large batch sizes cause Elasticsearch to create many requests and wait before starting the next set.
This is "bursty" instead of "smooth".

**Slicing**

Delete by query supports sliced scroll to parallelize the delete process.
This can improve efficiency and provide a convenient way to break the request down into smaller parts.

Setting \`slices\` to \`auto\` lets Elasticsearch choose the number of slices to use.
This setting will use one slice per shard, up to a certain limit.
If there are multiple source data streams or indices, it will choose the number of slices based on the index or backing index with the smallest number of shards.
Adding slices to the delete by query operation creates sub-requests which means it has some quirks:

* You can see these requests in the tasks APIs. These sub-requests are "child" tasks of the task for the request with slices.
* Fetching the status of the task for the request with slices only contains the status of completed slices.
* These sub-requests are individually addressable for things like cancellation and rethrottling.
* Rethrottling the request with \`slices\` will rethrottle the unfinished sub-request proportionally.
* Canceling the request with \`slices\` will cancel each sub-request.
* Due to the nature of \`slices\` each sub-request won't get a perfectly even portion of the documents. All documents will be addressed, but some slices may be larger than others. Expect larger slices to have a more even distribution.
* Parameters like \`requests_per_second\` and \`max_docs\` on a request with \`slices\` are distributed proportionally to each sub-request. Combine that with the earlier point about distribution being uneven and you should conclude that using \`max_docs\` with \`slices\` might not result in exactly \`max_docs\` documents being deleted.
* Each sub-request gets a slightly different snapshot of the source data stream or index though these are all taken at approximately the same time.

If you're slicing manually or otherwise tuning automatic slicing, keep in mind that:

* Query performance is most efficient when the number of slices is equal to the number of shards in the index or backing index. If that number is large (for example, 500), choose a lower number as too many \`slices\` hurts performance. Setting \`slices\` higher than the number of shards generally does not improve efficiency and adds overhead.
* Delete performance scales linearly across available resources with the number of slices.

Whether query or delete performance dominates the runtime depends on the documents being reindexed and cluster resources.

**Cancel a delete by query operation**

Any delete by query can be canceled using the task cancel API. For example:

\`\`\`
POST _tasks/r1A2WoRbTwKZ516z6NEs5A:36619/_cancel
\`\`\`

The task ID can be found by using the get tasks API.

Cancellation should happen quickly but might take a few seconds.
The get task status API will continue to list the delete by query task until this task checks that it has been cancelled and terminates itself.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-by-query`,
  methods: ['POST'],
  patterns: ['{index}/_delete_by_query'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-by-query',
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
      'preference',
      'refresh',
      'request_cache',
      'requests_per_second',
      'routing',
      'q',
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
      'wait_for_active_shards',
      'wait_for_completion',
    ],
    bodyParams: ['max_docs', 'query', 'slice', 'sort'],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_by_query_request, 'body'),
    ...getShapeAt(delete_by_query_request, 'path'),
    ...getShapeAt(delete_by_query_request, 'query'),
  }),
  outputSchema: delete_by_query_response,
};
