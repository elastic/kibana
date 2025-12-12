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
 * Source: elasticsearch-specification repository, operations: indices-data-streams-stats, indices-data-streams-stats-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_data_streams_stats1_request,
  indices_data_streams_stats1_response,
  indices_data_streams_stats_request,
  indices_data_streams_stats_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_DATA_STREAMS_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.data_streams_stats',
  summary: `Get data stream stats`,
  description: `Get data stream stats.

Get statistics for one or more data streams.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-data-streams-stats-1`,
  methods: ['GET'],
  patterns: ['_data_stream/_stats', '_data_stream/{name}/_stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-data-streams-stats-1',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['expand_wildcards'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_data_streams_stats_request, 'body'),
      ...getShapeAt(indices_data_streams_stats_request, 'path'),
      ...getShapeAt(indices_data_streams_stats_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_data_streams_stats1_request, 'body'),
      ...getShapeAt(indices_data_streams_stats1_request, 'path'),
      ...getShapeAt(indices_data_streams_stats1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    indices_data_streams_stats_response,
    indices_data_streams_stats1_response,
  ]),
};
