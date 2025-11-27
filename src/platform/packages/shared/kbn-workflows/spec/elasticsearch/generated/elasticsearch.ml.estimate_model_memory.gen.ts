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
 * Generated at: 2025-11-27T07:43:24.896Z
 * Source: elasticsearch-specification repository, operations: ml-estimate-model-memory
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_estimate_model_memory_request,
  ml_estimate_model_memory_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_ESTIMATE_MODEL_MEMORY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.estimate_model_memory',
  connectorGroup: 'internal',
  summary: `Estimate job model memory usage`,
  description: `Estimate job model memory usage.

Make an estimation of the memory usage for an anomaly detection job model.
The estimate is based on analysis configuration details for the job and cardinality
estimates for the fields it references.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-estimate-model-memory`,
  methods: ['POST'],
  patterns: ['_ml/anomaly_detectors/_estimate_model_memory'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-estimate-model-memory',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['analysis_config', 'max_bucket_cardinality', 'overall_cardinality'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_estimate_model_memory_request, 'body'),
    ...getShapeAt(ml_estimate_model_memory_request, 'path'),
    ...getShapeAt(ml_estimate_model_memory_request, 'query'),
  }),
  outputSchema: ml_estimate_model_memory_response,
};
