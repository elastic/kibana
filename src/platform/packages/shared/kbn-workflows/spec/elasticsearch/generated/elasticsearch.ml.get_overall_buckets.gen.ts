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
 * Generated at: 2025-11-27T07:43:24.899Z
 * Source: elasticsearch-specification repository, operations: ml-get-overall-buckets, ml-get-overall-buckets-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_overall_buckets1_request,
  ml_get_overall_buckets1_response,
  ml_get_overall_buckets_request,
  ml_get_overall_buckets_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_OVERALL_BUCKETS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_overall_buckets',
  connectorGroup: 'internal',
  summary: `Get overall bucket results`,
  description: `Get overall bucket results.

Retrievs overall bucket results that summarize the bucket results of
multiple anomaly detection jobs.

The \`overall_score\` is calculated by combining the scores of all the
buckets within the overall bucket span. First, the maximum
\`anomaly_score\` per anomaly detection job in the overall bucket is
calculated. Then the \`top_n\` of those scores are averaged to result in
the \`overall_score\`. This means that you can fine-tune the
\`overall_score\` so that it is more or less sensitive to the number of
jobs that detect an anomaly at the same time. For example, if you set
\`top_n\` to \`1\`, the \`overall_score\` is the maximum bucket score in the
overall bucket. Alternatively, if you set \`top_n\` to the number of jobs,
the \`overall_score\` is high only when all jobs detect anomalies in that
overall bucket. If you set the \`bucket_span\` parameter (to a value
greater than its default), the \`overall_score\` is the maximum
\`overall_score\` of the overall buckets that have a span equal to the
jobs' largest bucket span.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-overall-buckets`,
  methods: ['GET', 'POST'],
  patterns: ['_ml/anomaly_detectors/{job_id}/results/overall_buckets'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-overall-buckets',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: [
      'allow_no_match',
      'bucket_span',
      'end',
      'exclude_interim',
      'overall_score',
      'start',
      'top_n',
    ],
    bodyParams: [
      'allow_no_match',
      'bucket_span',
      'end',
      'exclude_interim',
      'overall_score',
      'start',
      'top_n',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_get_overall_buckets_request, 'body'),
      ...getShapeAt(ml_get_overall_buckets_request, 'path'),
      ...getShapeAt(ml_get_overall_buckets_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_overall_buckets1_request, 'body'),
      ...getShapeAt(ml_get_overall_buckets1_request, 'path'),
      ...getShapeAt(ml_get_overall_buckets1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([ml_get_overall_buckets_response, ml_get_overall_buckets1_response]),
};
