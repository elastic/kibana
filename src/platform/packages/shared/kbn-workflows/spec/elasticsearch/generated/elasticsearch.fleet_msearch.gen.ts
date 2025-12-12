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
 * Source: elasticsearch-specification repository, operations: fleet-msearch, fleet-msearch-1, fleet-msearch-2, fleet-msearch-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  fleet_msearch1_request,
  fleet_msearch1_response,
  fleet_msearch2_request,
  fleet_msearch2_response,
  fleet_msearch3_request,
  fleet_msearch3_response,
  fleet_msearch_request,
  fleet_msearch_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const FLEET_MSEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.fleet.msearch',
  summary: `Run multiple Fleet searches`,
  description: `Run multiple Fleet searches.

Run several Fleet searches with a single API request.
The API follows the same structure as the multi search API.
However, similar to the Fleet search API, it supports the \`wait_for_checkpoints\` parameter.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-fleet-msearch`,
  methods: ['GET', 'POST'],
  patterns: ['_fleet/_fleet_msearch', '{index}/_fleet/_fleet_msearch'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-fleet-msearch',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'ccs_minimize_roundtrips',
      'expand_wildcards',
      'ignore_throttled',
      'ignore_unavailable',
      'max_concurrent_searches',
      'max_concurrent_shard_requests',
      'pre_filter_shard_size',
      'search_type',
      'rest_total_hits_as_int',
      'typed_keys',
      'wait_for_checkpoints',
      'allow_partial_search_results',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(fleet_msearch_request, 'body'),
      ...getShapeAt(fleet_msearch_request, 'path'),
      ...getShapeAt(fleet_msearch_request, 'query'),
    }),
    z.object({
      ...getShapeAt(fleet_msearch1_request, 'body'),
      ...getShapeAt(fleet_msearch1_request, 'path'),
      ...getShapeAt(fleet_msearch1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(fleet_msearch2_request, 'body'),
      ...getShapeAt(fleet_msearch2_request, 'path'),
      ...getShapeAt(fleet_msearch2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(fleet_msearch3_request, 'body'),
      ...getShapeAt(fleet_msearch3_request, 'path'),
      ...getShapeAt(fleet_msearch3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    fleet_msearch_response,
    fleet_msearch1_response,
    fleet_msearch2_response,
    fleet_msearch3_response,
  ]),
};
