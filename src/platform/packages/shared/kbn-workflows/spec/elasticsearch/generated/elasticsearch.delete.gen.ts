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
 * Generated at: 2025-11-27T07:04:28.207Z
 * Source: elasticsearch-specification repository, operations: delete
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { delete_request, delete_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.delete',
  connectorGroup: 'internal',
  summary: `Delete a document`,
  description: `Delete a document.

Remove a JSON document from the specified index.

NOTE: You cannot send deletion requests directly to a data stream.
To delete a document in a data stream, you must target the backing index containing the document.

**Optimistic concurrency control**

Delete operations can be made conditional and only be performed if the last modification to the document was assigned the sequence number and primary term specified by the \`if_seq_no\` and \`if_primary_term\` parameters.
If a mismatch is detected, the operation will result in a \`VersionConflictException\` and a status code of \`409\`.

**Versioning**

Each document indexed is versioned.
When deleting a document, the version can be specified to make sure the relevant document you are trying to delete is actually being deleted and it has not changed in the meantime.
Every write operation run on a document, deletes included, causes its version to be incremented.
The version number of a deleted document remains available for a short time after deletion to allow for control of concurrent operations.
The length of time for which a deleted document's version remains available is determined by the \`index.gc_deletes\` index setting.

**Routing**

If routing is used during indexing, the routing value also needs to be specified to delete a document.

If the \`_routing\` mapping is set to \`required\` and no routing value is specified, the delete API throws a \`RoutingMissingException\` and rejects the request.

For example:

\`\`\`
DELETE /my-index-000001/_doc/1?routing=shard-1
\`\`\`

This request deletes the document with ID 1, but it is routed based on the user.
The document is not deleted if the correct routing is not specified.

**Distributed**

The delete operation gets hashed into a specific shard ID.
It then gets redirected into the primary shard within that ID group and replicated (if needed) to shard replicas within that ID group.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete`,
  methods: ['DELETE'],
  patterns: ['{index}/_doc/{id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'id'],
    urlParams: [
      'if_primary_term',
      'if_seq_no',
      'refresh',
      'routing',
      'timeout',
      'version',
      'version_type',
      'wait_for_active_shards',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_request, 'body'),
    ...getShapeAt(delete_request, 'path'),
    ...getShapeAt(delete_request, 'query'),
  }),
  outputSchema: delete_response,
};
