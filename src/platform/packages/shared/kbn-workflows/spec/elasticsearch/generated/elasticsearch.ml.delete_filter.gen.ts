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
 * Generated at: 2025-11-27T07:43:24.895Z
 * Source: elasticsearch-specification repository, operations: ml-delete-filter
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_delete_filter_request, ml_delete_filter_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_DELETE_FILTER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_filter',
  connectorGroup: 'internal',
  summary: `Delete a filter`,
  description: `Delete a filter.

If an anomaly detection job references the filter, you cannot delete the
filter. You must update or delete the job before you can delete the filter.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-filter`,
  methods: ['DELETE'],
  patterns: ['_ml/filters/{filter_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-filter',
  parameterTypes: {
    headerParams: [],
    pathParams: ['filter_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_delete_filter_request, 'body'),
    ...getShapeAt(ml_delete_filter_request, 'path'),
    ...getShapeAt(ml_delete_filter_request, 'query'),
  }),
  outputSchema: ml_delete_filter_response,
};
