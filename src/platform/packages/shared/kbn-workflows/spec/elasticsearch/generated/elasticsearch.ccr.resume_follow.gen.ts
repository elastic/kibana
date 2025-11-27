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
 * Generated at: 2025-11-27T07:04:28.191Z
 * Source: elasticsearch-specification repository, operations: ccr-resume-follow
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ccr_resume_follow_request, ccr_resume_follow_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CCR_RESUME_FOLLOW_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.resume_follow',
  connectorGroup: 'internal',
  summary: `Resume a follower`,
  description: `Resume a follower.

Resume a cross-cluster replication follower index that was paused.
The follower index could have been paused with the pause follower API.
Alternatively it could be paused due to replication that cannot be retried due to failures during following tasks.
When this API returns, the follower index will resume fetching operations from the leader index.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-resume-follow`,
  methods: ['POST'],
  patterns: ['{index}/_ccr/resume_follow'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-resume-follow',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['master_timeout'],
    bodyParams: [
      'max_outstanding_read_requests',
      'max_outstanding_write_requests',
      'max_read_request_operation_count',
      'max_read_request_size',
      'max_retry_delay',
      'max_write_buffer_count',
      'max_write_buffer_size',
      'max_write_request_operation_count',
      'max_write_request_size',
      'read_poll_timeout',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(ccr_resume_follow_request, 'body'),
    ...getShapeAt(ccr_resume_follow_request, 'path'),
    ...getShapeAt(ccr_resume_follow_request, 'query'),
  }),
  outputSchema: ccr_resume_follow_response,
};
