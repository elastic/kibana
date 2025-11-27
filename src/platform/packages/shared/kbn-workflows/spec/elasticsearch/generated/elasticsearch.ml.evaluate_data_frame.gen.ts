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
 * Source: elasticsearch-specification repository, operations: ml-evaluate-data-frame
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_evaluate_data_frame_request,
  ml_evaluate_data_frame_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_EVALUATE_DATA_FRAME_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.evaluate_data_frame',
  connectorGroup: 'internal',
  summary: `Evaluate data frame analytics`,
  description: `Evaluate data frame analytics.

The API packages together commonly used evaluation metrics for various types
of machine learning features. This has been designed for use on indexes
created by data frame analytics. Evaluation requires both a ground truth
field and an analytics result field to be present.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-evaluate-data-frame`,
  methods: ['POST'],
  patterns: ['_ml/data_frame/_evaluate'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-evaluate-data-frame',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['evaluation', 'index', 'query'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_evaluate_data_frame_request, 'body'),
    ...getShapeAt(ml_evaluate_data_frame_request, 'path'),
    ...getShapeAt(ml_evaluate_data_frame_request, 'query'),
  }),
  outputSchema: ml_evaluate_data_frame_response,
};
