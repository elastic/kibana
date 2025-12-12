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
 * Source: elasticsearch-specification repository, operations: ccr-follow-info
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ccr_follow_info_request, ccr_follow_info_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CCR_FOLLOW_INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.follow_info',
  summary: `Get follower information`,
  description: `Get follower information.

Get information about all cross-cluster replication follower indices.
For example, the results include follower index names, leader index names, replication options, and whether the follower indices are active or paused.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-follow-info`,
  methods: ['GET'],
  patterns: ['{index}/_ccr/info'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-follow-info',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ccr_follow_info_request, 'body'),
    ...getShapeAt(ccr_follow_info_request, 'path'),
    ...getShapeAt(ccr_follow_info_request, 'query'),
  }),
  outputSchema: ccr_follow_info_response,
};
