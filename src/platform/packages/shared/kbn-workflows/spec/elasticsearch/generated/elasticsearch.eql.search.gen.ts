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
 * Generated at: 2025-11-27T07:43:24.869Z
 * Source: elasticsearch-specification repository, operations: eql-search, eql-search-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  eql_search1_request,
  eql_search1_response,
  eql_search_request,
  eql_search_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const EQL_SEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.eql.search',
  connectorGroup: 'internal',
  summary: `Get EQL search results`,
  description: `Get EQL search results.

Returns search results for an Event Query Language (EQL) query.
EQL assumes each document in a data stream or index corresponds to an event.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-search`,
  methods: ['GET', 'POST'],
  patterns: ['{index}/_eql/search'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-search',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'allow_partial_search_results',
      'allow_partial_sequence_results',
      'expand_wildcards',
      'ccs_minimize_roundtrips',
      'ignore_unavailable',
      'keep_alive',
      'keep_on_completion',
      'wait_for_completion_timeout',
    ],
    bodyParams: [
      'query',
      'case_sensitive',
      'event_category_field',
      'tiebreaker_field',
      'timestamp_field',
      'fetch_size',
      'filter',
      'keep_alive',
      'keep_on_completion',
      'wait_for_completion_timeout',
      'allow_partial_search_results',
      'allow_partial_sequence_results',
      'size',
      'fields',
      'result_position',
      'runtime_mappings',
      'max_samples_per_key',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(eql_search_request, 'body'),
      ...getShapeAt(eql_search_request, 'path'),
      ...getShapeAt(eql_search_request, 'query'),
    }),
    z.object({
      ...getShapeAt(eql_search1_request, 'body'),
      ...getShapeAt(eql_search1_request, 'path'),
      ...getShapeAt(eql_search1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([eql_search_response, eql_search1_response]),
};
