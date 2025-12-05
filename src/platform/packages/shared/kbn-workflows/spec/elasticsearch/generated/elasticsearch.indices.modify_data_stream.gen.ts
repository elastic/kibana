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
 * Source: elasticsearch-specification repository, operations: indices-modify-data-stream
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_modify_data_stream_request,
  indices_modify_data_stream_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_MODIFY_DATA_STREAM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.modify_data_stream',
  summary: `Update data streams`,
  description: `Update data streams.

Performs one or more data stream modification actions in a single atomic operation.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-modify-data-stream`,
  methods: ['POST'],
  patterns: ['_data_stream/_modify'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-modify-data-stream',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['actions'],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_modify_data_stream_request, 'body'),
    ...getShapeAt(indices_modify_data_stream_request, 'path'),
    ...getShapeAt(indices_modify_data_stream_request, 'query'),
  }),
  outputSchema: indices_modify_data_stream_response,
};
