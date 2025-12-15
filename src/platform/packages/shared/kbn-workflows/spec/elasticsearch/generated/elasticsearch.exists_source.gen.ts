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
 * Source: elasticsearch-specification repository, operations: exists-source
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { exists_source_request } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const EXISTS_SOURCE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.exists_source',
  summary: `Check for a document source`,
  description: `Check for a document source.

Check whether a document source exists in an index.
For example:

\`\`\`
HEAD my-index-000001/_source/1
\`\`\`

A document's source is not available if it is disabled in the mapping.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get`,
  methods: ['HEAD'],
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
    ...getShapeAt(exists_source_request, 'body'),
    ...getShapeAt(exists_source_request, 'path'),
    ...getShapeAt(exists_source_request, 'query'),
  }),
  outputSchema: z.optional(z.looseObject({})),
};
