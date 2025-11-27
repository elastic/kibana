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
 * Generated at: 2025-11-27T07:43:24.901Z
 * Source: elasticsearch-specification repository, operations: ml-put-job
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_put_job_request, ml_put_job_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_PUT_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_job',
  connectorGroup: 'internal',
  summary: `Create an anomaly detection job`,
  description: `Create an anomaly detection job.

If you include a \`datafeed_config\`, you must have read index privileges on the source index.
If you include a \`datafeed_config\` but do not provide a query, the datafeed uses \`{"match_all": {"boost": 1}}\`.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-job`,
  methods: ['PUT'],
  patterns: ['_ml/anomaly_detectors/{job_id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-job',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: ['allow_no_indices', 'expand_wildcards', 'ignore_throttled', 'ignore_unavailable'],
    bodyParams: [
      'allow_lazy_open',
      'analysis_config',
      'analysis_limits',
      'background_persist_interval',
      'custom_settings',
      'daily_model_snapshot_retention_after_days',
      'data_description',
      'datafeed_config',
      'description',
      'job_id',
      'groups',
      'model_plot_config',
      'model_snapshot_retention_days',
      'renormalization_window_days',
      'results_index_name',
      'results_retention_days',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_put_job_request, 'body'),
    ...getShapeAt(ml_put_job_request, 'path'),
    ...getShapeAt(ml_put_job_request, 'query'),
  }),
  outputSchema: ml_put_job_response,
};
