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
 * Source: elasticsearch-specification repository, operations: reindex
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { reindex_request, reindex_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const REINDEX_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.reindex',
  summary: `Reindex documents`,
  description: `Reindex documents.

Copy documents from a source to a destination.
You can copy all documents to the destination index or reindex a subset of the documents.
The source can be any existing index, alias, or data stream.
The destination must differ from the source.
For example, you cannot reindex a data stream into itself.

IMPORTANT: Reindex requires \`_source\` to be enabled for all documents in the source.
The destination should be configured as wanted before calling the reindex API.
Reindex does not copy the settings from the source or its associated template.
Mappings, shard counts, and replicas, for example, must be configured ahead of time.

If the Elasticsearch security features are enabled, you must have the following security privileges:

* The \`read\` index privilege for the source data stream, index, or alias.
* The \`write\` index privilege for the destination data stream, index, or index alias.
* To automatically create a data stream or index with a reindex API request, you must have the \`auto_configure\`, \`create_index\`, or \`manage\` index privilege for the destination data stream, index, or alias.
* If reindexing from a remote cluster, the \`source.remote.user\` must have the \`monitor\` cluster privilege and the \`read\` index privilege for the source data stream, index, or alias.

If reindexing from a remote cluster, you must explicitly allow the remote host in the \`reindex.remote.whitelist\` setting.
Automatic data stream creation requires a matching index template with data stream enabled.

The \`dest\` element can be configured like the index API to control optimistic concurrency control.
Omitting \`version_type\` or setting it to \`internal\` causes Elasticsearch to blindly dump documents into the destination, overwriting any that happen to have the same ID.

Setting \`version_type\` to \`external\` causes Elasticsearch to preserve the \`version\` from the source, create any documents that are missing, and update any documents that have an older version in the destination than they do in the source.

Setting \`op_type\` to \`create\` causes the reindex API to create only missing documents in the destination.
All existing documents will cause a version conflict.

IMPORTANT: Because data streams are append-only, any reindex request to a destination data stream must have an \`op_type\` of \`create\`.
A reindex can only add new documents to a destination data stream.
It cannot update existing documents in a destination data stream.

By default, version conflicts abort the reindex process.
To continue reindexing if there are conflicts, set the \`conflicts\` request body property to \`proceed\`.
In this case, the response includes a count of the version conflicts that were encountered.
Note that the handling of other error types is unaffected by the \`conflicts\` property.
Additionally, if you opt to count version conflicts, the operation could attempt to reindex more documents from the source than \`max_docs\` until it has successfully indexed \`max_docs\` documents into the target or it has gone through every document in the source query.

It's recommended to reindex on indices with a green status. Reindexing can fail when a node shuts down or crashes.
* When requested with \`wait_for_completion=true\` (default), the request fails if the node shuts down.
* When requested with \`wait_for_completion=false\`, a task id is returned, for use with the task management APIs. The task may disappear or fail if the node shuts down.
When retrying a failed reindex operation, it might be necessary to set \`conflicts=proceed\` or to first delete the partial destination index.
Additionally, dry runs, checking disk space, and fetching index recovery information can help address the root cause.

Refer to the linked documentation for examples of how to reindex documents.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-reindex`,
  methods: ['POST'],
  patterns: ['_reindex'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-reindex',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'refresh',
      'requests_per_second',
      'scroll',
      'slices',
      'max_docs',
      'timeout',
      'wait_for_active_shards',
      'wait_for_completion',
      'require_alias',
    ],
    bodyParams: ['conflicts', 'dest', 'max_docs', 'script', 'source'],
  },
  paramsSchema: z.object({
    ...getShapeAt(reindex_request, 'body'),
    ...getShapeAt(reindex_request, 'path'),
    ...getShapeAt(reindex_request, 'query'),
  }),
  outputSchema: reindex_response,
};
