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
 * Generated at: 2025-11-27T07:43:24.877Z
 * Source: elasticsearch-specification repository, operations: indices-get-data-stream-settings
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_get_data_stream_settings_request,
  indices_get_data_stream_settings_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_GET_DATA_STREAM_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_data_stream_settings',
  connectorGroup: 'internal',
  summary: `Get data stream settings`,
  description: `Get data stream settings.

Get setting information for one or more data streams.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-stream-settings`,
  methods: ['GET'],
  patterns: ['_data_stream/{name}/_settings'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-stream-settings',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_get_data_stream_settings_request, 'body'),
    ...getShapeAt(indices_get_data_stream_settings_request, 'path'),
    ...getShapeAt(indices_get_data_stream_settings_request, 'query'),
  }),
  outputSchema: indices_get_data_stream_settings_response,
};
