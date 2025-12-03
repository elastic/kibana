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
 * Source: elasticsearch-specification repository, operations: indices-delete-data-lifecycle
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_delete_data_lifecycle_request,
  indices_delete_data_lifecycle_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_DELETE_DATA_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.delete_data_lifecycle',
  summary: `Delete data stream lifecycles`,
  description: `Delete data stream lifecycles.

Removes the data stream lifecycle from a data stream, rendering it not managed by the data stream lifecycle.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-data-lifecycle`,
  methods: ['DELETE'],
  patterns: ['_data_stream/{name}/_lifecycle'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-data-lifecycle',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['expand_wildcards', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_delete_data_lifecycle_request, 'body'),
    ...getShapeAt(indices_delete_data_lifecycle_request, 'path'),
    ...getShapeAt(indices_delete_data_lifecycle_request, 'query'),
  }),
  outputSchema: indices_delete_data_lifecycle_response,
};
