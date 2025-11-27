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
 * Generated at: 2025-11-27T07:04:28.224Z
 * Source: elasticsearch-specification repository, operations: indices-remove-block
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { indices_remove_block_request, indices_remove_block_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_REMOVE_BLOCK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.remove_block',
  connectorGroup: 'internal',
  summary: `Remove an index block`,
  description: `Remove an index block.

Remove an index block from an index.
Index blocks limit the operations allowed on an index by blocking specific operation types.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-remove-block`,
  methods: ['DELETE'],
  patterns: ['{index}/_block/{block}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-remove-block',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'block'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'master_timeout',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_remove_block_request, 'body'),
    ...getShapeAt(indices_remove_block_request, 'path'),
    ...getShapeAt(indices_remove_block_request, 'query'),
  }),
  outputSchema: indices_remove_block_response,
};
