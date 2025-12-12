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
 * Source: elasticsearch-specification repository, operations: ml-update-job
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_update_job_request, ml_update_job_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_UPDATE_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.update_job',
  summary: `Update an anomaly detection job`,
  description: `Update an anomaly detection job.

Updates certain properties of an anomaly detection job.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-job`,
  methods: ['POST'],
  patterns: ['_ml/anomaly_detectors/{job_id}/_update'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-job',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: [],
    bodyParams: [
      'allow_lazy_open',
      'analysis_limits',
      'background_persist_interval',
      'custom_settings',
      'categorization_filters',
      'description',
      'model_plot_config',
      'model_prune_window',
      'daily_model_snapshot_retention_after_days',
      'model_snapshot_retention_days',
      'renormalization_window_days',
      'results_retention_days',
      'groups',
      'detectors',
      'per_partition_categorization',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_update_job_request, 'body'),
    ...getShapeAt(ml_update_job_request, 'path'),
    ...getShapeAt(ml_update_job_request, 'query'),
  }),
  outputSchema: ml_update_job_response,
};
