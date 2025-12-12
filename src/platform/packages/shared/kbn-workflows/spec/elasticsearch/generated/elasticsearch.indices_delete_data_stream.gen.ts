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
 * Source: elasticsearch-specification repository, operations: indices-delete-data-stream
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_delete_data_stream_request,
  indices_delete_data_stream_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_DELETE_DATA_STREAM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.delete_data_stream',
  summary: `Delete data streams`,
  description: `Delete data streams.

Deletes one or more data streams and their backing indices.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-data-stream`,
  methods: ['DELETE'],
  patterns: ['_data_stream/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-data-stream',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout', 'expand_wildcards'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_delete_data_stream_request, 'body'),
    ...getShapeAt(indices_delete_data_stream_request, 'path'),
    ...getShapeAt(indices_delete_data_stream_request, 'query'),
  }),
  outputSchema: indices_delete_data_stream_response,
};
