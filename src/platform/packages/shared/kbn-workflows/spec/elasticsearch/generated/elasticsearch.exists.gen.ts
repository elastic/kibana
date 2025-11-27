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
 * Generated at: 2025-11-27T07:04:28.209Z
 * Source: elasticsearch-specification repository, operations: exists
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { exists_request, exists_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const EXISTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.exists',
  connectorGroup: 'internal',
  summary: `Check a document`,
  description: `Check a document.

Verify that a document exists.
For example, check to see if a document with the \`_id\` 0 exists:

\`\`\`
HEAD my-index-000001/_doc/0
\`\`\`

If the document exists, the API returns a status code of \`200 - OK\`.
If the document doesn’t exist, the API returns \`404 - Not Found\`.

**Versioning support**

You can use the \`version\` parameter to check the document only if its current version is equal to the specified one.

Internally, Elasticsearch has marked the old document as deleted and added an entirely new document.
The old version of the document doesn't disappear immediately, although you won't be able to access it.
Elasticsearch cleans up deleted documents in the background as you continue to index more data.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get`,
  methods: ['HEAD'],
  patterns: ['{index}/_doc/{id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'id'],
    urlParams: [
      'preference',
      'realtime',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_includes',
      'stored_fields',
      'version',
      'version_type',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(exists_request, 'body'),
    ...getShapeAt(exists_request, 'path'),
    ...getShapeAt(exists_request, 'query'),
  }),
  outputSchema: exists_response,
};
