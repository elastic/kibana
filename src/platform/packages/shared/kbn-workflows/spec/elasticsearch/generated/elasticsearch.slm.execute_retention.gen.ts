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
 * Source: elasticsearch-specification repository, operations: slm-execute-retention
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  slm_execute_retention_request,
  slm_execute_retention_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SLM_EXECUTE_RETENTION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.execute_retention',
  summary: `Run a retention policy`,
  description: `Run a retention policy.

Manually apply the retention policy to force immediate removal of snapshots that are expired according to the snapshot lifecycle policy retention rules.
The retention policy is normally applied according to its schedule.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-execute-retention`,
  methods: ['POST'],
  patterns: ['_slm/_execute_retention'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-execute-retention',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(slm_execute_retention_request, 'body'),
    ...getShapeAt(slm_execute_retention_request, 'path'),
    ...getShapeAt(slm_execute_retention_request, 'query'),
  }),
  outputSchema: slm_execute_retention_response,
};
