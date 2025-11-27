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
 * Generated at: 2025-11-27T07:04:28.208Z
 * Source: elasticsearch-specification repository, operations: enrich-put-policy
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { enrich_put_policy_request, enrich_put_policy_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ENRICH_PUT_POLICY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.enrich.put_policy',
  connectorGroup: 'internal',
  summary: `Create an enrich policy`,
  description: `Create an enrich policy.

Creates an enrich policy.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-put-policy`,
  methods: ['PUT'],
  patterns: ['_enrich/policy/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-put-policy',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout'],
    bodyParams: ['geo_match', 'match', 'range'],
  },
  paramsSchema: z.object({
    ...getShapeAt(enrich_put_policy_request, 'body'),
    ...getShapeAt(enrich_put_policy_request, 'path'),
    ...getShapeAt(enrich_put_policy_request, 'query'),
  }),
  outputSchema: enrich_put_policy_response,
};
