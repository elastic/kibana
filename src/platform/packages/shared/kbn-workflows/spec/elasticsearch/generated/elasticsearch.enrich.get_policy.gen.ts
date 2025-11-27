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
 * Generated at: 2025-11-27T07:43:24.868Z
 * Source: elasticsearch-specification repository, operations: enrich-get-policy, enrich-get-policy-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  enrich_get_policy1_request,
  enrich_get_policy1_response,
  enrich_get_policy_request,
  enrich_get_policy_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ENRICH_GET_POLICY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.enrich.get_policy',
  connectorGroup: 'internal',
  summary: `Get an enrich policy`,
  description: `Get an enrich policy.

Returns information about an enrich policy.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-get-policy`,
  methods: ['GET'],
  patterns: ['_enrich/policy/{name}', '_enrich/policy'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-get-policy',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(enrich_get_policy_request, 'body'),
      ...getShapeAt(enrich_get_policy_request, 'path'),
      ...getShapeAt(enrich_get_policy_request, 'query'),
    }),
    z.object({
      ...getShapeAt(enrich_get_policy1_request, 'body'),
      ...getShapeAt(enrich_get_policy1_request, 'path'),
      ...getShapeAt(enrich_get_policy1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([enrich_get_policy_response, enrich_get_policy1_response]),
};
