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
 * Source: elasticsearch-specification repository, operations: update
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { update_request, update_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const UPDATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.update',
  summary: `Update a document`,
  description: `Update a document.

Update a document by running a script or passing a partial document.

If the Elasticsearch security features are enabled, you must have the \`index\` or \`write\` index privilege for the target index or index alias.

The script can update, delete, or skip modifying the document.
The API also supports passing a partial document, which is merged into the existing document.
To fully replace an existing document, use the index API.
This operation:

* Gets the document (collocated with the shard) from the index.
* Runs the specified script.
* Indexes the result.

The document must still be reindexed, but using this API removes some network roundtrips and reduces chances of version conflicts between the GET and the index operation.

The \`_source\` field must be enabled to use this API.
In addition to \`_source\`, you can access the following variables through the \`ctx\` map: \`_index\`, \`_type\`, \`_id\`, \`_version\`, \`_routing\`, and \`_now\` (the current timestamp).
For usage examples such as partial updates, upserts, and scripted updates, see the External documentation.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update`,
  methods: ['POST'],
  patterns: ['{index}/_update/{id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'id'],
    urlParams: [
      'if_primary_term',
      'if_seq_no',
      'include_source_on_error',
      'lang',
      'refresh',
      'require_alias',
      'retry_on_conflict',
      'routing',
      'timeout',
      'wait_for_active_shards',
      '_source',
      '_source_excludes',
      '_source_includes',
    ],
    bodyParams: [
      'detect_noop',
      'doc',
      'doc_as_upsert',
      'script',
      'scripted_upsert',
      '_source',
      'upsert',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(update_request, 'body'),
    ...getShapeAt(update_request, 'path'),
    ...getShapeAt(update_request, 'query'),
  }),
  outputSchema: update_response,
};
