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
 * Source: elasticsearch-specification repository, operations: ccr-pause-follow
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ccr_pause_follow_request, ccr_pause_follow_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CCR_PAUSE_FOLLOW_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.pause_follow',
  summary: `Pause a follower`,
  description: `Pause a follower.

Pause a cross-cluster replication follower index.
The follower index will not fetch any additional operations from the leader index.
You can resume following with the resume follower API.
You can pause and resume a follower index to change the configuration of the following task.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-pause-follow`,
  methods: ['POST'],
  patterns: ['{index}/_ccr/pause_follow'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-pause-follow',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ccr_pause_follow_request, 'body'),
    ...getShapeAt(ccr_pause_follow_request, 'path'),
    ...getShapeAt(ccr_pause_follow_request, 'query'),
  }),
  outputSchema: ccr_pause_follow_response,
};
