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
 * Source: elasticsearch-specification repository, operations: indices-get-data-stream-mappings
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_get_data_stream_mappings_request,
  indices_get_data_stream_mappings_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_GET_DATA_STREAM_MAPPINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_data_stream_mappings',
  summary: `Get data stream mappings`,
  description: `Get data stream mappings.

Get mapping information for one or more data streams.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-stream-mappings`,
  methods: ['GET'],
  patterns: ['_data_stream/{name}/_mappings'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-stream-mappings',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_get_data_stream_mappings_request, 'body'),
    ...getShapeAt(indices_get_data_stream_mappings_request, 'path'),
    ...getShapeAt(indices_get_data_stream_mappings_request, 'query'),
  }),
  outputSchema: indices_get_data_stream_mappings_response,
};
