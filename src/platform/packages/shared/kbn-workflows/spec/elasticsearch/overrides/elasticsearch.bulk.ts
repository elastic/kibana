/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * OVERRIDE FILE
 *
 * Source: elasticsearch-specification repository, operations: bulk, bulk-1, bulk-2, bulk-3
 * This override:
 * 1. Adds the `index` path parameter
 * 2. Uses passthrough() on operations to preserve arbitrary document fields
 */

import { z } from '@kbn/zod/v4';

import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';
import {
  bulk2_request,
  bulk_response,
  global_bulk_operation_container,
  global_bulk_update_action,
  types_indices,
} from '../generated/schemas/es_openapi_zod.gen';

/**
 * Custom bulk operations schema that uses passthrough() to preserve all fields.
 * Bulk operations contain:
 * 1. Action metadata (index, create, delete, update)
 * 2. Document data (for index/create - the document to index)
 * 3. Update actions (for update - doc, script, etc.)
 *
 * The document data can have arbitrary fields that need to be preserved.
 */
const bulkOperationsSchema = z.array(
  z.union([
    global_bulk_operation_container.loose(),
    global_bulk_update_action.loose(),
    z.record(z.string(), z.unknown()),
  ])
);

// export contract
export const BULK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.bulk',
  summary: `Bulk index or delete documents`,
  description: `Bulk index or delete documents.

Perform multiple \`index\`, \`create\`, \`delete\`, and \`update\` actions in a single request.
This reduces overhead and can greatly increase indexing speed.

If the Elasticsearch security features are enabled, you must have the following index privileges for the target data stream, index, or index alias:

* To use the \`create\` action, you must have the \`create_doc\`, \`create\`, \`index\`, or \`write\` index privilege. Data streams support only the \`create\` action.
* To use the \`index\` action, you must have the \`create\`, \`index\`, or \`write\` index privilege.
* To use the \`delete\` action, you must have the \`delete\` or \`write\` index privilege.
* To use the \`update\` action, you must have the \`index\` or \`write\` index privilege.
* To automatically create a data stream or index with a bulk API request, you must have the \`auto_configure\`, \`create_index\`, or \`manage\` index privilege.
* To make the result of a bulk operation visible to search using the \`refresh\` parameter, you must have the \`maintenance\` or \`manage\` index privilege.

Automatic data stream creation requires a matching index template with data stream enabled.

The actions are specified in the request body using a newline delimited JSON (NDJSON) structure:

\`\`\`
action_and_meta_data\\n
optional_source\\n
action_and_meta_data\\n
optional_source\\n
....
action_and_meta_data\\n
optional_source\\n
\`\`\`

The \`index\` and \`create\` actions expect a source on the next line and have the same semantics as the \`op_type\` parameter in the standard index API.
A \`create\` action fails if a document with the same ID already exists in the target
An \`index\` action adds or replaces a document as necessary.

NOTE: Data streams support only the \`create\` action.
To update or delete a document in a data stream, you must target the backing index containing the document.

An \`update\` action expects that the partial doc, upsert, and script and its options are specified on the next line.

A \`delete\` action does not expect a source on the next line and has the same semantics as the standard delete API.

NOTE: The final line of data must end with a newline character (\`\\n\`).
Each newline character may be preceded by a carriage return (\`\\r\`).
When sending NDJSON data to the \`_bulk\` endpoint, use a \`Content-Type\` header of \`application/json\` or \`application/x-ndjson\`.
Because this format uses literal newline characters (\`\\n\`) as delimiters, make sure that the JSON actions and sources are not pretty printed.

If you provide a target in the request path, it is used for any actions that don't explicitly specify an \`_index\` argument.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk`,
  methods: ['POST', 'PUT'],
  patterns: ['_bulk', '{index}/_bulk'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'include_source_on_error',
      'list_executed_pipelines',
      'pipeline',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_includes',
      'timeout',
      'wait_for_active_shards',
      'require_alias',
      'require_data_stream',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    index: z.optional(types_indices),
    operations: bulkOperationsSchema,
    ...getShapeAt(bulk2_request, 'query'),
  }),
  outputSchema: bulk_response,
};
