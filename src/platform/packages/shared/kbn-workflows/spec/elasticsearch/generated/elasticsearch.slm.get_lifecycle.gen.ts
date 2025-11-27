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
 * Source: elasticsearch-specification repository, operations: slm-get-lifecycle, slm-get-lifecycle-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  slm_get_lifecycle1_request,
  slm_get_lifecycle1_response,
  slm_get_lifecycle_request,
  slm_get_lifecycle_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SLM_GET_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.get_lifecycle',
  connectorGroup: 'internal',
  summary: `Get policy information`,
  description: `Get policy information.

Get snapshot lifecycle policy definitions and information about the latest snapshot attempts.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-get-lifecycle`,
  methods: ['GET'],
  patterns: ['_slm/policy/{policy_id}', '_slm/policy'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-get-lifecycle',
  parameterTypes: {
    headerParams: [],
    pathParams: ['policy_id'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(slm_get_lifecycle_request, 'body'),
      ...getShapeAt(slm_get_lifecycle_request, 'path'),
      ...getShapeAt(slm_get_lifecycle_request, 'query'),
    }),
    z.object({
      ...getShapeAt(slm_get_lifecycle1_request, 'body'),
      ...getShapeAt(slm_get_lifecycle1_request, 'path'),
      ...getShapeAt(slm_get_lifecycle1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([slm_get_lifecycle_response, slm_get_lifecycle1_response]),
};
