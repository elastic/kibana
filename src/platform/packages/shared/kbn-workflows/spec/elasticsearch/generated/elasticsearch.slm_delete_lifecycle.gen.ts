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
 * Source: elasticsearch-specification repository, operations: slm-delete-lifecycle
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  slm_delete_lifecycle_request,
  slm_delete_lifecycle_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SLM_DELETE_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.delete_lifecycle',
  summary: `Delete a policy`,
  description: `Delete a policy.

Delete a snapshot lifecycle policy definition.
This operation prevents any future snapshots from being taken but does not cancel in-progress snapshots or remove previously-taken snapshots.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-delete-lifecycle`,
  methods: ['DELETE'],
  patterns: ['_slm/policy/{policy_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-delete-lifecycle',
  parameterTypes: {
    headerParams: [],
    pathParams: ['policy_id'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(slm_delete_lifecycle_request, 'body'),
    ...getShapeAt(slm_delete_lifecycle_request, 'path'),
    ...getShapeAt(slm_delete_lifecycle_request, 'query'),
  }),
  outputSchema: slm_delete_lifecycle_response,
};
