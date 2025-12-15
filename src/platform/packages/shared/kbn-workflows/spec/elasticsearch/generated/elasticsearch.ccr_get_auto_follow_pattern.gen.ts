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
 * Source: elasticsearch-specification repository, operations: ccr-get-auto-follow-pattern, ccr-get-auto-follow-pattern-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ccr_get_auto_follow_pattern1_request,
  ccr_get_auto_follow_pattern1_response,
  ccr_get_auto_follow_pattern_request,
  ccr_get_auto_follow_pattern_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CCR_GET_AUTO_FOLLOW_PATTERN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.get_auto_follow_pattern',
  summary: `Get auto-follow patterns`,
  description: `Get auto-follow patterns.

Get cross-cluster replication auto-follow patterns.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-get-auto-follow-pattern-1`,
  methods: ['GET'],
  patterns: ['_ccr/auto_follow', '_ccr/auto_follow/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-get-auto-follow-pattern-1',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ccr_get_auto_follow_pattern_request, 'body'),
      ...getShapeAt(ccr_get_auto_follow_pattern_request, 'path'),
      ...getShapeAt(ccr_get_auto_follow_pattern_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ccr_get_auto_follow_pattern1_request, 'body'),
      ...getShapeAt(ccr_get_auto_follow_pattern1_request, 'path'),
      ...getShapeAt(ccr_get_auto_follow_pattern1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    ccr_get_auto_follow_pattern_response,
    ccr_get_auto_follow_pattern1_response,
  ]),
};
