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
 * Source: elasticsearch-specification repository, operations: slm-put-lifecycle
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { slm_put_lifecycle_request, slm_put_lifecycle_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SLM_PUT_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.put_lifecycle',
  connectorGroup: 'internal',
  summary: `Create or update a policy`,
  description: `Create or update a policy.

Create or update a snapshot lifecycle policy.
If the policy already exists, this request increments the policy version.
Only the latest version of a policy is stored.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-put-lifecycle`,
  methods: ['PUT'],
  patterns: ['_slm/policy/{policy_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-put-lifecycle',
  parameterTypes: {
    headerParams: [],
    pathParams: ['policy_id'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: ['config', 'name', 'repository', 'retention', 'schedule'],
  },
  paramsSchema: z.object({
    ...getShapeAt(slm_put_lifecycle_request, 'body'),
    ...getShapeAt(slm_put_lifecycle_request, 'path'),
    ...getShapeAt(slm_put_lifecycle_request, 'query'),
  }),
  outputSchema: slm_put_lifecycle_response,
};
