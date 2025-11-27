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
 * Source: elasticsearch-specification repository, operations: ilm-get-lifecycle, ilm-get-lifecycle-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ilm_get_lifecycle1_request,
  ilm_get_lifecycle1_response,
  ilm_get_lifecycle_request,
  ilm_get_lifecycle_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ILM_GET_LIFECYCLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.get_lifecycle',
  connectorGroup: 'internal',
  summary: `Get lifecycle policies`,
  description: `Get lifecycle policies.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-get-lifecycle`,
  methods: ['GET'],
  patterns: ['_ilm/policy/{policy}', '_ilm/policy'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-get-lifecycle',
  parameterTypes: {
    headerParams: [],
    pathParams: ['policy'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ilm_get_lifecycle_request, 'body'),
      ...getShapeAt(ilm_get_lifecycle_request, 'path'),
      ...getShapeAt(ilm_get_lifecycle_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ilm_get_lifecycle1_request, 'body'),
      ...getShapeAt(ilm_get_lifecycle1_request, 'path'),
      ...getShapeAt(ilm_get_lifecycle1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([ilm_get_lifecycle_response, ilm_get_lifecycle1_response]),
};
