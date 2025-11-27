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
 * Generated at: 2025-11-27T07:43:24.897Z
 * Source: elasticsearch-specification repository, operations: ml-get-categories, ml-get-categories-1, ml-get-categories-2, ml-get-categories-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_categories1_request,
  ml_get_categories1_response,
  ml_get_categories2_request,
  ml_get_categories2_response,
  ml_get_categories3_request,
  ml_get_categories3_response,
  ml_get_categories_request,
  ml_get_categories_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_CATEGORIES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_categories',
  connectorGroup: 'internal',
  summary: `Get anomaly detection job results for categories`,
  description: `Get anomaly detection job results for categories.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-categories`,
  methods: ['GET', 'POST'],
  patterns: [
    '_ml/anomaly_detectors/{job_id}/results/categories/{category_id}',
    '_ml/anomaly_detectors/{job_id}/results/categories',
  ],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-categories',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id', 'category_id'],
    urlParams: ['from', 'partition_field_value', 'size'],
    bodyParams: ['page'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_get_categories_request, 'body'),
      ...getShapeAt(ml_get_categories_request, 'path'),
      ...getShapeAt(ml_get_categories_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_categories1_request, 'body'),
      ...getShapeAt(ml_get_categories1_request, 'path'),
      ...getShapeAt(ml_get_categories1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_categories2_request, 'body'),
      ...getShapeAt(ml_get_categories2_request, 'path'),
      ...getShapeAt(ml_get_categories2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_categories3_request, 'body'),
      ...getShapeAt(ml_get_categories3_request, 'path'),
      ...getShapeAt(ml_get_categories3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    ml_get_categories_response,
    ml_get_categories1_response,
    ml_get_categories2_response,
    ml_get_categories3_response,
  ]),
};
