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
 * Source: elasticsearch-specification repository, operations: ml-get-model-snapshot-upgrade-stats
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_model_snapshot_upgrade_stats_request,
  ml_get_model_snapshot_upgrade_stats_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_MODEL_SNAPSHOT_UPGRADE_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_model_snapshot_upgrade_stats',
  summary: `Get anomaly detection job model snapshot upgrade usage info`,
  description: `Get anomaly detection job model snapshot upgrade usage info.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-model-snapshot-upgrade-stats`,
  methods: ['GET'],
  patterns: ['_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_upgrade/_stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-model-snapshot-upgrade-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id', 'snapshot_id'],
    urlParams: ['allow_no_match'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_get_model_snapshot_upgrade_stats_request, 'body'),
    ...getShapeAt(ml_get_model_snapshot_upgrade_stats_request, 'path'),
    ...getShapeAt(ml_get_model_snapshot_upgrade_stats_request, 'query'),
  }),
  outputSchema: ml_get_model_snapshot_upgrade_stats_response,
};
