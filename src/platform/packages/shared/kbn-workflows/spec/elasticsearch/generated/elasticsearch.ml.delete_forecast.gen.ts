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
 * Source: elasticsearch-specification repository, operations: ml-delete-forecast, ml-delete-forecast-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_delete_forecast1_request,
  ml_delete_forecast1_response,
  ml_delete_forecast_request,
  ml_delete_forecast_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_DELETE_FORECAST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_forecast',
  connectorGroup: 'internal',
  summary: `Delete forecasts from a job`,
  description: `Delete forecasts from a job.

By default, forecasts are retained for 14 days. You can specify a
different retention period with the \`expires_in\` parameter in the forecast
jobs API. The delete forecast API enables you to delete one or more
forecasts before they expire.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-forecast`,
  methods: ['DELETE'],
  patterns: [
    '_ml/anomaly_detectors/{job_id}/_forecast',
    '_ml/anomaly_detectors/{job_id}/_forecast/{forecast_id}',
  ],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-forecast',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id', 'forecast_id'],
    urlParams: ['allow_no_forecasts', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_delete_forecast_request, 'body'),
      ...getShapeAt(ml_delete_forecast_request, 'path'),
      ...getShapeAt(ml_delete_forecast_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_delete_forecast1_request, 'body'),
      ...getShapeAt(ml_delete_forecast1_request, 'path'),
      ...getShapeAt(ml_delete_forecast1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([ml_delete_forecast_response, ml_delete_forecast1_response]),
};
