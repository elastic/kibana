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
 * Source: elasticsearch-specification repository, operations: indices-clear-cache, indices-clear-cache-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_clear_cache1_request,
  indices_clear_cache1_response,
  indices_clear_cache_request,
  indices_clear_cache_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_CLEAR_CACHE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.clear_cache',
  summary: `Clear the cache`,
  description: `Clear the cache.

Clear the cache of one or more indices.
For data streams, the API clears the caches of the stream's backing indices.

By default, the clear cache API clears all caches.
To clear only specific caches, use the \`fielddata\`, \`query\`, or \`request\` parameters.
To clear the cache only of specific fields, use the \`fields\` parameter.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-clear-cache`,
  methods: ['POST'],
  patterns: ['_cache/clear', '{index}/_cache/clear'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-clear-cache',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'index',
      'allow_no_indices',
      'expand_wildcards',
      'fielddata',
      'fields',
      'ignore_unavailable',
      'query',
      'request',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_clear_cache_request, 'body'),
      ...getShapeAt(indices_clear_cache_request, 'path'),
      ...getShapeAt(indices_clear_cache_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_clear_cache1_request, 'body'),
      ...getShapeAt(indices_clear_cache1_request, 'path'),
      ...getShapeAt(indices_clear_cache1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_clear_cache_response, indices_clear_cache1_response]),
};
