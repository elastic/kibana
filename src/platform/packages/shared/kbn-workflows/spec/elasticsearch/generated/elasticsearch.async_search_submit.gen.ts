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
 * Source: elasticsearch-specification repository, operations: async-search-submit, async-search-submit-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  async_search_submit1_request,
  async_search_submit1_response,
  async_search_submit_request,
  async_search_submit_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ASYNC_SEARCH_SUBMIT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.async_search.submit',
  summary: `Run an async search`,
  description: `Run an async search.

When the primary sort of the results is an indexed field, shards get sorted based on minimum and maximum value that they hold for that field. Partial results become available following the sort criteria that was requested.

Warning: Asynchronous search does not support scroll or search requests that include only the suggest section.

By default, Elasticsearch does not allow you to store an async search response larger than 10Mb and an attempt to do this results in an error.
The maximum allowed size for a stored async search response can be set by changing the \`search.max_async_search_response_size\` cluster level setting.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit`,
  methods: ['POST'],
  patterns: ['_async_search', '{index}/_async_search'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'wait_for_completion_timeout',
      'keep_alive',
      'keep_on_completion',
      'allow_no_indices',
      'allow_partial_search_results',
      'analyzer',
      'analyze_wildcard',
      'batched_reduce_size',
      'ccs_minimize_roundtrips',
      'default_operator',
      'df',
      'docvalue_fields',
      'expand_wildcards',
      'explain',
      'ignore_throttled',
      'ignore_unavailable',
      'lenient',
      'max_concurrent_shard_requests',
      'preference',
      'request_cache',
      'routing',
      'search_type',
      'stats',
      'stored_fields',
      'suggest_field',
      'suggest_mode',
      'suggest_size',
      'suggest_text',
      'terminate_after',
      'timeout',
      'track_total_hits',
      'track_scores',
      'typed_keys',
      'rest_total_hits_as_int',
      'version',
      '_source',
      '_source_excludes',
      '_source_includes',
      'seq_no_primary_term',
      'q',
      'size',
      'from',
      'sort',
    ],
    bodyParams: [
      'aggregations',
      'collapse',
      'explain',
      'ext',
      'from',
      'highlight',
      'track_total_hits',
      'indices_boost',
      'docvalue_fields',
      'knn',
      'min_score',
      'post_filter',
      'profile',
      'query',
      'rescore',
      'script_fields',
      'search_after',
      'size',
      'slice',
      'sort',
      '_source',
      'fields',
      'suggest',
      'terminate_after',
      'timeout',
      'track_scores',
      'version',
      'seq_no_primary_term',
      'stored_fields',
      'pit',
      'runtime_mappings',
      'stats',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(async_search_submit_request, 'body'),
      ...getShapeAt(async_search_submit_request, 'path'),
      ...getShapeAt(async_search_submit_request, 'query'),
    }),
    z.object({
      ...getShapeAt(async_search_submit1_request, 'body'),
      ...getShapeAt(async_search_submit1_request, 'path'),
      ...getShapeAt(async_search_submit1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([async_search_submit_response, async_search_submit1_response]),
};
