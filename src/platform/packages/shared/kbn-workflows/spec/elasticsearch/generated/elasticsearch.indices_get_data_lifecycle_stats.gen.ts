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
 * Source: elasticsearch-specification repository, operations: indices-get-data-lifecycle-stats
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_get_data_lifecycle_stats_request,
  indices_get_data_lifecycle_stats_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_GET_DATA_LIFECYCLE_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_data_lifecycle_stats',
  summary: `Get data stream lifecycle stats`,
  description: `Get data stream lifecycle stats.

Get statistics about the data streams that are managed by a data stream lifecycle.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-lifecycle-stats`,
  methods: ['GET'],
  patterns: ['_lifecycle/stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-lifecycle-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_get_data_lifecycle_stats_request, 'body'),
    ...getShapeAt(indices_get_data_lifecycle_stats_request, 'path'),
    ...getShapeAt(indices_get_data_lifecycle_stats_request, 'query'),
  }),
  outputSchema: indices_get_data_lifecycle_stats_response,
};
