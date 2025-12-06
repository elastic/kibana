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
 * Source: elasticsearch-specification repository, operations: ml-forecast
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_forecast_request, ml_forecast_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_FORECAST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.forecast',
  summary: `Predict future behavior of a time series`,
  description: `Predict future behavior of a time series.

Forecasts are not supported for jobs that perform population analysis; an
error occurs if you try to create a forecast for a job that has an
\`over_field_name\` in its configuration. Forcasts predict future behavior
based on historical data.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-forecast`,
  methods: ['POST'],
  patterns: ['_ml/anomaly_detectors/{job_id}/_forecast'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-forecast',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: ['duration', 'expires_in', 'max_model_memory'],
    bodyParams: ['duration', 'expires_in', 'max_model_memory'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_forecast_request, 'body'),
    ...getShapeAt(ml_forecast_request, 'path'),
    ...getShapeAt(ml_forecast_request, 'query'),
  }),
  outputSchema: ml_forecast_response,
};
