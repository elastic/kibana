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
 * Generated at: 2025-11-27T07:04:28.235Z
 * Source: elasticsearch-specification repository, operations: ml-get-model-snapshots, ml-get-model-snapshots-1, ml-get-model-snapshots-2, ml-get-model-snapshots-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_model_snapshots1_request,
  ml_get_model_snapshots1_response,
  ml_get_model_snapshots2_request,
  ml_get_model_snapshots2_response,
  ml_get_model_snapshots3_request,
  ml_get_model_snapshots3_response,
  ml_get_model_snapshots_request,
  ml_get_model_snapshots_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_MODEL_SNAPSHOTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_model_snapshots',
  connectorGroup: 'internal',
  summary: `Get model snapshots info`,
  description: `Get model snapshots info.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-model-snapshots`,
  methods: ['GET', 'POST'],
  patterns: [
    '_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}',
    '_ml/anomaly_detectors/{job_id}/model_snapshots',
  ],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-model-snapshots',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id', 'snapshot_id'],
    urlParams: ['desc', 'end', 'from', 'size', 'sort', 'start'],
    bodyParams: ['desc', 'end', 'page', 'sort', 'start'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_get_model_snapshots_request, 'body'),
      ...getShapeAt(ml_get_model_snapshots_request, 'path'),
      ...getShapeAt(ml_get_model_snapshots_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_model_snapshots1_request, 'body'),
      ...getShapeAt(ml_get_model_snapshots1_request, 'path'),
      ...getShapeAt(ml_get_model_snapshots1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_model_snapshots2_request, 'body'),
      ...getShapeAt(ml_get_model_snapshots2_request, 'path'),
      ...getShapeAt(ml_get_model_snapshots2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_model_snapshots3_request, 'body'),
      ...getShapeAt(ml_get_model_snapshots3_request, 'path'),
      ...getShapeAt(ml_get_model_snapshots3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    ml_get_model_snapshots_response,
    ml_get_model_snapshots1_response,
    ml_get_model_snapshots2_response,
    ml_get_model_snapshots3_response,
  ]),
};
