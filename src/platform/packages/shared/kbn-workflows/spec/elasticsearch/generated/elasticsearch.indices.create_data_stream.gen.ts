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
 * Generated at: 2025-11-27T07:43:24.874Z
 * Source: elasticsearch-specification repository, operations: indices-create-data-stream
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_create_data_stream_request,
  indices_create_data_stream_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_CREATE_DATA_STREAM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.create_data_stream',
  connectorGroup: 'internal',
  summary: `Create a data stream`,
  description: `Create a data stream.

You must have a matching index template with data stream enabled.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create-data-stream`,
  methods: ['PUT'],
  patterns: ['_data_stream/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create-data-stream',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_create_data_stream_request, 'body'),
    ...getShapeAt(indices_create_data_stream_request, 'path'),
    ...getShapeAt(indices_create_data_stream_request, 'query'),
  }),
  outputSchema: indices_create_data_stream_response,
};
