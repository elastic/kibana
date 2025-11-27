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
 * Source: elasticsearch-specification repository, operations: ml-delete-model-snapshot
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_delete_model_snapshot_request,
  ml_delete_model_snapshot_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_DELETE_MODEL_SNAPSHOT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_model_snapshot',
  connectorGroup: 'internal',
  summary: `Delete a model snapshot`,
  description: `Delete a model snapshot.

You cannot delete the active model snapshot. To delete that snapshot, first
revert to a different one. To identify the active model snapshot, refer to
the \`model_snapshot_id\` in the results from the get jobs API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-model-snapshot`,
  methods: ['DELETE'],
  patterns: ['_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-model-snapshot',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id', 'snapshot_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_delete_model_snapshot_request, 'body'),
    ...getShapeAt(ml_delete_model_snapshot_request, 'path'),
    ...getShapeAt(ml_delete_model_snapshot_request, 'query'),
  }),
  outputSchema: ml_delete_model_snapshot_response,
};
