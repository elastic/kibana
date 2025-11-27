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
 * Generated at: 2025-11-27T07:43:24.919Z
 * Source: elasticsearch-specification repository, operations: slm-execute-lifecycle
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  slm_execute_lifecycle_request,
  slm_execute_lifecycle_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SLM_EXECUTE_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.execute_lifecycle',
  connectorGroup: 'internal',
  summary: `Run a policy`,
  description: `Run a policy.

Immediately create a snapshot according to the snapshot lifecycle policy without waiting for the scheduled time.
The snapshot policy is normally applied according to its schedule, but you might want to manually run a policy before performing an upgrade or other maintenance.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-execute-lifecycle`,
  methods: ['PUT'],
  patterns: ['_slm/policy/{policy_id}/_execute'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-execute-lifecycle',
  parameterTypes: {
    headerParams: [],
    pathParams: ['policy_id'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(slm_execute_lifecycle_request, 'body'),
    ...getShapeAt(slm_execute_lifecycle_request, 'path'),
    ...getShapeAt(slm_execute_lifecycle_request, 'query'),
  }),
  outputSchema: slm_execute_lifecycle_response,
};
