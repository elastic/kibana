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
 * Source: elasticsearch-specification repository, operations: search, search-1, search-2, search-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  search1_request,
  search1_response,
  search2_request,
  search2_response,
  search3_request,
  search3_response,
  search_request,
  search_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search',
  summary: `Run a search`,
  description: `Run a search.

Get search hits that match the query defined in the request.
You can provide search queries using the \`q\` query string parameter or the request body.
If both are specified, only the query parameter is used.

If the Elasticsearch security features are enabled, you must have the read index privilege for the target data stream, index, or alias. For cross-cluster search, refer to the documentation about configuring CCS privileges.
To search a point in time (PIT) for an alias, you must have the \`read\` index privilege for the alias's data streams or indices.

**Search slicing**

When paging through a large number of documents, it can be helpful to split the search into multiple slices to consume them independently with the \`slice\` and \`pit\` properties.
By default the splitting is done first on the shards, then locally on each shard.
The local splitting partitions the shard into contiguous ranges based on Lucene document IDs.

For instance if the number of shards is equal to 2 and you request 4 slices, the slices 0 and 2 are assigned to the first shard and the slices 1 and 3 are assigned to the second shard.

IMPORTANT: The same point-in-time ID should be used for all slices.
If different PIT IDs are used, slices can overlap and miss documents.
This situation can occur because the splitting criterion is based on Lucene document IDs, which are not stable across changes to the index.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search`,
  methods: ['GET', 'POST'],
  patterns: ['_search', '{index}/_search'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
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
      'include_named_queries_score',
      'lenient',
      'max_concurrent_shard_requests',
      'preference',
      'pre_filter_shard_size',
      'request_cache',
      'routing',
      'scroll',
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
      '_source_exclude_vectors',
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
      'rank',
      'min_score',
      'post_filter',
      'profile',
      'query',
      'rescore',
      'retriever',
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
      ...getShapeAt(search_request, 'body'),
      ...getShapeAt(search_request, 'path'),
      ...getShapeAt(search_request, 'query'),
    }),
    z.object({
      ...getShapeAt(search1_request, 'body'),
      ...getShapeAt(search1_request, 'path'),
      ...getShapeAt(search1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(search2_request, 'body'),
      ...getShapeAt(search2_request, 'path'),
      ...getShapeAt(search2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(search3_request, 'body'),
      ...getShapeAt(search3_request, 'path'),
      ...getShapeAt(search3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([search_response, search1_response, search2_response, search3_response]),
};
