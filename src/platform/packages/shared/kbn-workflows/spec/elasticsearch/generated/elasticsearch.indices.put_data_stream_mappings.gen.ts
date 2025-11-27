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
 * Source: elasticsearch-specification repository, operations: indices-put-data-stream-mappings
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_put_data_stream_mappings_request,
  indices_put_data_stream_mappings_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_PUT_DATA_STREAM_MAPPINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_data_stream_mappings',
  connectorGroup: 'internal',
  summary: `Update data stream mappings`,
  description: `Update data stream mappings.

This API can be used to override mappings on specific data streams. These overrides will take precedence over what
is specified in the template that the data stream matches. The mapping change is only applied to new write indices
that are created during rollover after this API is called. No indices are changed by this API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-data-stream-mappings`,
  methods: ['PUT'],
  patterns: ['_data_stream/{name}/_mappings'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-data-stream-mappings',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['dry_run', 'master_timeout', 'timeout'],
    bodyParams: [
      'all_field',
      'date_detection',
      'dynamic',
      'dynamic_date_formats',
      'dynamic_templates',
      '_field_names',
      'index_field',
      '_meta',
      'numeric_detection',
      'properties',
      '_routing',
      '_size',
      '_source',
      'runtime',
      'enabled',
      'subobjects',
      '_data_stream_timestamp',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_put_data_stream_mappings_request, 'body'),
    ...getShapeAt(indices_put_data_stream_mappings_request, 'path'),
    ...getShapeAt(indices_put_data_stream_mappings_request, 'query'),
  }),
  outputSchema: indices_put_data_stream_mappings_response,
};
