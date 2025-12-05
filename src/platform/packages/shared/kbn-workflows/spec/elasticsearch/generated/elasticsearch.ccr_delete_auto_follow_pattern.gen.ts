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
 * Source: elasticsearch-specification repository, operations: ccr-delete-auto-follow-pattern
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ccr_delete_auto_follow_pattern_request,
  ccr_delete_auto_follow_pattern_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CCR_DELETE_AUTO_FOLLOW_PATTERN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.delete_auto_follow_pattern',
  summary: `Delete auto-follow patterns`,
  description: `Delete auto-follow patterns.

Delete a collection of cross-cluster replication auto-follow patterns.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-delete-auto-follow-pattern`,
  methods: ['DELETE'],
  patterns: ['_ccr/auto_follow/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-delete-auto-follow-pattern',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ccr_delete_auto_follow_pattern_request, 'body'),
    ...getShapeAt(ccr_delete_auto_follow_pattern_request, 'path'),
    ...getShapeAt(ccr_delete_auto_follow_pattern_request, 'query'),
  }),
  outputSchema: ccr_delete_auto_follow_pattern_response,
};
