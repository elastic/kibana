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
 * Generated at: 2025-11-27T07:04:28.234Z
 * Source: elasticsearch-specification repository, operations: ml-get-buckets, ml-get-buckets-1, ml-get-buckets-2, ml-get-buckets-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_buckets1_request,
  ml_get_buckets1_response,
  ml_get_buckets2_request,
  ml_get_buckets2_response,
  ml_get_buckets3_request,
  ml_get_buckets3_response,
  ml_get_buckets_request,
  ml_get_buckets_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_BUCKETS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_buckets',
  connectorGroup: 'internal',
  summary: `Get anomaly detection job results for buckets`,
  description: `Get anomaly detection job results for buckets.

The API presents a chronological view of the records, grouped by bucket.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-buckets`,
  methods: ['GET', 'POST'],
  patterns: [
    '_ml/anomaly_detectors/{job_id}/results/buckets/{timestamp}',
    '_ml/anomaly_detectors/{job_id}/results/buckets',
  ],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-buckets',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id', 'timestamp'],
    urlParams: [
      'anomaly_score',
      'desc',
      'end',
      'exclude_interim',
      'expand',
      'from',
      'size',
      'sort',
      'start',
    ],
    bodyParams: [
      'anomaly_score',
      'desc',
      'end',
      'exclude_interim',
      'expand',
      'page',
      'sort',
      'start',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_get_buckets_request, 'body'),
      ...getShapeAt(ml_get_buckets_request, 'path'),
      ...getShapeAt(ml_get_buckets_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_buckets1_request, 'body'),
      ...getShapeAt(ml_get_buckets1_request, 'path'),
      ...getShapeAt(ml_get_buckets1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_buckets2_request, 'body'),
      ...getShapeAt(ml_get_buckets2_request, 'path'),
      ...getShapeAt(ml_get_buckets2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_buckets3_request, 'body'),
      ...getShapeAt(ml_get_buckets3_request, 'path'),
      ...getShapeAt(ml_get_buckets3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    ml_get_buckets_response,
    ml_get_buckets1_response,
    ml_get_buckets2_response,
    ml_get_buckets3_response,
  ]),
};
