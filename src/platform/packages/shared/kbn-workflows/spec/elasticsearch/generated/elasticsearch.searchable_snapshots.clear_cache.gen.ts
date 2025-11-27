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
 * Generated at: 2025-11-27T07:43:24.909Z
 * Source: elasticsearch-specification repository, operations: searchable-snapshots-clear-cache, searchable-snapshots-clear-cache-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  searchable_snapshots_clear_cache1_request,
  searchable_snapshots_clear_cache1_response,
  searchable_snapshots_clear_cache_request,
  searchable_snapshots_clear_cache_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCHABLE_SNAPSHOTS_CLEAR_CACHE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.searchable_snapshots.clear_cache',
  connectorGroup: 'internal',
  summary: `Clear the cache`,
  description: `Clear the cache.

Clear indices and data streams from the shared cache for partially mounted indices.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-clear-cache`,
  methods: ['POST'],
  patterns: ['_searchable_snapshots/cache/clear', '{index}/_searchable_snapshots/cache/clear'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-clear-cache',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['expand_wildcards', 'allow_no_indices', 'ignore_unavailable'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(searchable_snapshots_clear_cache_request, 'body'),
      ...getShapeAt(searchable_snapshots_clear_cache_request, 'path'),
      ...getShapeAt(searchable_snapshots_clear_cache_request, 'query'),
    }),
    z.object({
      ...getShapeAt(searchable_snapshots_clear_cache1_request, 'body'),
      ...getShapeAt(searchable_snapshots_clear_cache1_request, 'path'),
      ...getShapeAt(searchable_snapshots_clear_cache1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    searchable_snapshots_clear_cache_response,
    searchable_snapshots_clear_cache1_response,
  ]),
};
