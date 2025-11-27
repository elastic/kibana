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
 * Source: elasticsearch-specification repository, operations: fleet-search, fleet-search-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  fleet_search1_request,
  fleet_search1_response,
  fleet_search_request,
  fleet_search_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const FLEET_SEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.fleet.search',
  connectorGroup: 'internal',
  summary: `Run a Fleet search`,
  description: `Run a Fleet search.

The purpose of the Fleet search API is to provide an API where the search will be run only
after the provided checkpoint has been processed and is visible for searches inside of Elasticsearch.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-fleet-search`,
  methods: ['GET', 'POST'],
  patterns: ['{index}/_fleet/_fleet_search'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-fleet-search',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
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
      '_source_includes',
      'seq_no_primary_term',
      'q',
      'size',
      'from',
      'sort',
      'wait_for_checkpoints',
      'allow_partial_search_results',
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
      ...getShapeAt(fleet_search_request, 'body'),
      ...getShapeAt(fleet_search_request, 'path'),
      ...getShapeAt(fleet_search_request, 'query'),
    }),
    z.object({
      ...getShapeAt(fleet_search1_request, 'body'),
      ...getShapeAt(fleet_search1_request, 'path'),
      ...getShapeAt(fleet_search1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([fleet_search_response, fleet_search1_response]),
};
