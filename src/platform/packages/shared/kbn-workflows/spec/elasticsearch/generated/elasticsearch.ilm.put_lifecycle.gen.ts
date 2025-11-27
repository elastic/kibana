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
 * Generated at: 2025-11-27T07:43:24.872Z
 * Source: elasticsearch-specification repository, operations: ilm-put-lifecycle
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ilm_put_lifecycle_request, ilm_put_lifecycle_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ILM_PUT_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.put_lifecycle',
  connectorGroup: 'internal',
  summary: `Create or update a lifecycle policy`,
  description: `Create or update a lifecycle policy.

If the specified policy exists, it is replaced and the policy version is incremented.

NOTE: Only the latest version of the policy is stored, you cannot revert to previous versions.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-put-lifecycle`,
  methods: ['PUT'],
  patterns: ['_ilm/policy/{policy}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-put-lifecycle',
  parameterTypes: {
    headerParams: [],
    pathParams: ['policy'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: ['policy'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ilm_put_lifecycle_request, 'body'),
    ...getShapeAt(ilm_put_lifecycle_request, 'path'),
    ...getShapeAt(ilm_put_lifecycle_request, 'query'),
  }),
  outputSchema: ilm_put_lifecycle_response,
};
