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
 * Generated at: 2025-11-27T07:04:28.240Z
 * Source: elasticsearch-specification repository, operations: ml-update-model-snapshot
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_update_model_snapshot_request,
  ml_update_model_snapshot_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_UPDATE_MODEL_SNAPSHOT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.update_model_snapshot',
  connectorGroup: 'internal',
  summary: `Update a snapshot`,
  description: `Update a snapshot.

Updates certain properties of a snapshot.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-model-snapshot`,
  methods: ['POST'],
  patterns: ['_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_update'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-model-snapshot',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id', 'snapshot_id'],
    urlParams: [],
    bodyParams: ['description', 'retain'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_update_model_snapshot_request, 'body'),
    ...getShapeAt(ml_update_model_snapshot_request, 'path'),
    ...getShapeAt(ml_update_model_snapshot_request, 'query'),
  }),
  outputSchema: ml_update_model_snapshot_response,
};
