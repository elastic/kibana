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
 * Source: elasticsearch-specification repository, operations: ccr-resume-auto-follow-pattern
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ccr_resume_auto_follow_pattern_request,
  ccr_resume_auto_follow_pattern_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CCR_RESUME_AUTO_FOLLOW_PATTERN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.resume_auto_follow_pattern',
  connectorGroup: 'internal',
  summary: `Resume an auto-follow pattern`,
  description: `Resume an auto-follow pattern.

Resume a cross-cluster replication auto-follow pattern that was paused.
The auto-follow pattern will resume configuring following indices for newly created indices that match its patterns on the remote cluster.
Remote indices created while the pattern was paused will also be followed unless they have been deleted or closed in the interim.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-resume-auto-follow-pattern`,
  methods: ['POST'],
  patterns: ['_ccr/auto_follow/{name}/resume'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-resume-auto-follow-pattern',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ccr_resume_auto_follow_pattern_request, 'body'),
    ...getShapeAt(ccr_resume_auto_follow_pattern_request, 'path'),
    ...getShapeAt(ccr_resume_auto_follow_pattern_request, 'query'),
  }),
  outputSchema: ccr_resume_auto_follow_pattern_response,
};
