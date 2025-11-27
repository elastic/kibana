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
 * Generated at: 2025-11-27T07:43:24.880Z
 * Source: elasticsearch-specification repository, operations: indices-put-data-stream-options
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_put_data_stream_options_request,
  indices_put_data_stream_options_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_PUT_DATA_STREAM_OPTIONS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_data_stream_options',
  connectorGroup: 'internal',
  summary: `Update data stream options`,
  description: `Update data stream options.

Update the data stream options of the specified data streams.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-data-stream-options`,
  methods: ['PUT'],
  patterns: ['_data_stream/{name}/_options'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-data-stream-options',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['expand_wildcards', 'master_timeout', 'timeout'],
    bodyParams: ['failure_store'],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_put_data_stream_options_request, 'body'),
    ...getShapeAt(indices_put_data_stream_options_request, 'path'),
    ...getShapeAt(indices_put_data_stream_options_request, 'query'),
  }),
  outputSchema: indices_put_data_stream_options_response,
};
