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
 * Generated at: 2025-11-27T07:43:24.876Z
 * Source: elasticsearch-specification repository, operations: indices-field-usage-stats
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_field_usage_stats_request,
  indices_field_usage_stats_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_FIELD_USAGE_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.field_usage_stats',
  connectorGroup: 'internal',
  summary: `Get field usage stats`,
  description: `Get field usage stats.

Get field usage information for each shard and field of an index.
Field usage statistics are automatically captured when queries are running on a cluster.
A shard-level search request that accesses a given field, even if multiple times during that request, is counted as a single use.

The response body reports the per-shard usage count of the data structures that back the fields in the index.
A given request will increment each count by a maximum value of 1, even if the request accesses the same field multiple times.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-field-usage-stats`,
  methods: ['GET'],
  patterns: ['{index}/_field_usage_stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-field-usage-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['allow_no_indices', 'expand_wildcards', 'ignore_unavailable', 'fields'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_field_usage_stats_request, 'body'),
    ...getShapeAt(indices_field_usage_stats_request, 'path'),
    ...getShapeAt(indices_field_usage_stats_request, 'query'),
  }),
  outputSchema: indices_field_usage_stats_response,
};
