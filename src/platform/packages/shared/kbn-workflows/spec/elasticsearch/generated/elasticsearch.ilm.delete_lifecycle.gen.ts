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
 * Generated at: 2025-11-27T07:04:28.211Z
 * Source: elasticsearch-specification repository, operations: ilm-delete-lifecycle
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ilm_delete_lifecycle_request, ilm_delete_lifecycle_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ILM_DELETE_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.delete_lifecycle',
  connectorGroup: 'internal',
  summary: `Delete a lifecycle policy`,
  description: `Delete a lifecycle policy.

You cannot delete policies that are currently in use. If the policy is being used to manage any indices, the request fails and returns an error.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-delete-lifecycle`,
  methods: ['DELETE'],
  patterns: ['_ilm/policy/{policy}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-delete-lifecycle',
  parameterTypes: {
    headerParams: [],
    pathParams: ['policy'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ilm_delete_lifecycle_request, 'body'),
    ...getShapeAt(ilm_delete_lifecycle_request, 'path'),
    ...getShapeAt(ilm_delete_lifecycle_request, 'query'),
  }),
  outputSchema: ilm_delete_lifecycle_response,
};
