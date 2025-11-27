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
 * Generated at: 2025-11-27T07:43:24.871Z
 * Source: elasticsearch-specification repository, operations: get-source
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { get_source_request, get_source_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const GET_SOURCE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.get_source',
  connectorGroup: 'internal',
  summary: `Get a document's source`,
  description: `Get a document's source.

Get the source of a document.
For example:

\`\`\`
GET my-index-000001/_source/1
\`\`\`

You can use the source filtering parameters to control which parts of the \`_source\` are returned:

\`\`\`
GET my-index-000001/_source/1/?_source_includes=*.id&_source_excludes=entities
\`\`\`

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get`,
  methods: ['GET'],
  patterns: ['{index}/_source/{id}'],
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
      'version',
      'version_type',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_source_request, 'body'),
    ...getShapeAt(get_source_request, 'path'),
    ...getShapeAt(get_source_request, 'query'),
  }),
  outputSchema: get_source_response,
};
