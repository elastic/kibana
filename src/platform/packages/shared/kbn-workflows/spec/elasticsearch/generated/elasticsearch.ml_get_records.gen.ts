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
 * Source: elasticsearch-specification repository, operations: ml-get-records, ml-get-records-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_records1_request,
  ml_get_records1_response,
  ml_get_records_request,
  ml_get_records_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_RECORDS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_records',
  summary: `Get anomaly records for an anomaly detection job`,
  description: `Get anomaly records for an anomaly detection job.

Records contain the detailed analytical results. They describe the anomalous
activity that has been identified in the input data based on the detector
configuration.
There can be many anomaly records depending on the characteristics and size
of the input data. In practice, there are often too many to be able to
manually process them. The machine learning features therefore perform a
sophisticated aggregation of the anomaly records into buckets.
The number of record results depends on the number of anomalies found in each
bucket, which relates to the number of time series being modeled and the
number of detectors.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-records`,
  methods: ['GET', 'POST'],
  patterns: ['_ml/anomaly_detectors/{job_id}/results/records'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-records',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: ['desc', 'end', 'exclude_interim', 'from', 'record_score', 'size', 'sort', 'start'],
    bodyParams: ['desc', 'end', 'exclude_interim', 'page', 'record_score', 'sort', 'start'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_get_records_request, 'body'),
      ...getShapeAt(ml_get_records_request, 'path'),
      ...getShapeAt(ml_get_records_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_records1_request, 'body'),
      ...getShapeAt(ml_get_records1_request, 'path'),
      ...getShapeAt(ml_get_records1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([ml_get_records_response, ml_get_records1_response]),
};
