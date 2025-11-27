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
 * Generated at: 2025-11-27T07:04:28.246Z
 * Source: elasticsearch-specification repository, operations: search-shards, search-shards-1, search-shards-2, search-shards-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  search_shards1_request,
  search_shards1_response,
  search_shards2_request,
  search_shards2_response,
  search_shards3_request,
  search_shards3_response,
  search_shards_request,
  search_shards_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCH_SHARDS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_shards',
  connectorGroup: 'internal',
  summary: `Get the search shards`,
  description: `Get the search shards.

Get the indices and shards that a search request would be run against.
This information can be useful for working out issues or planning optimizations with routing and shard preferences.
When filtered aliases are used, the filter is returned as part of the \`indices\` section.

If the Elasticsearch security features are enabled, you must have the \`view_index_metadata\` or \`manage\` index privilege for the target data stream, index, or alias.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-shards`,
  methods: ['GET', 'POST'],
  patterns: ['_search_shards', '{index}/_search_shards'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-shards',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'local',
      'master_timeout',
      'preference',
      'routing',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(search_shards_request, 'body'),
      ...getShapeAt(search_shards_request, 'path'),
      ...getShapeAt(search_shards_request, 'query'),
    }),
    z.object({
      ...getShapeAt(search_shards1_request, 'body'),
      ...getShapeAt(search_shards1_request, 'path'),
      ...getShapeAt(search_shards1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(search_shards2_request, 'body'),
      ...getShapeAt(search_shards2_request, 'path'),
      ...getShapeAt(search_shards2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(search_shards3_request, 'body'),
      ...getShapeAt(search_shards3_request, 'path'),
      ...getShapeAt(search_shards3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    search_shards_response,
    search_shards1_response,
    search_shards2_response,
    search_shards3_response,
  ]),
};
