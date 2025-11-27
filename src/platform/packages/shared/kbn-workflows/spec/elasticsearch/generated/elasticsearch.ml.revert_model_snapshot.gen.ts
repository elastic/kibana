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
 * Generated at: 2025-11-27T07:43:24.902Z
 * Source: elasticsearch-specification repository, operations: ml-revert-model-snapshot
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_revert_model_snapshot_request,
  ml_revert_model_snapshot_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_REVERT_MODEL_SNAPSHOT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.revert_model_snapshot',
  connectorGroup: 'internal',
  summary: `Revert to a snapshot`,
  description: `Revert to a snapshot.

The machine learning features react quickly to anomalous input, learning new
behaviors in data. Highly anomalous input increases the variance in the
models whilst the system learns whether this is a new step-change in behavior
or a one-off event. In the case where this anomalous input is known to be a
one-off, then it might be appropriate to reset the model state to a time
before this event. For example, you might consider reverting to a saved
snapshot after Black Friday or a critical system failure.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-revert-model-snapshot`,
  methods: ['POST'],
  patterns: ['_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_revert'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-revert-model-snapshot',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id', 'snapshot_id'],
    urlParams: ['delete_intervening_results'],
    bodyParams: ['delete_intervening_results'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_revert_model_snapshot_request, 'body'),
    ...getShapeAt(ml_revert_model_snapshot_request, 'path'),
    ...getShapeAt(ml_revert_model_snapshot_request, 'query'),
  }),
  outputSchema: ml_revert_model_snapshot_response,
};
