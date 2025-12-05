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
 * Source: elasticsearch-specification repository, operations: enrich-execute-policy
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  enrich_execute_policy_request,
  enrich_execute_policy_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ENRICH_EXECUTE_POLICY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.enrich.execute_policy',
  summary: `Run an enrich policy`,
  description: `Run an enrich policy.

Create the enrich index for an existing enrich policy.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-execute-policy`,
  methods: ['PUT'],
  patterns: ['_enrich/policy/{name}/_execute'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-execute-policy',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout', 'wait_for_completion'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(enrich_execute_policy_request, 'body'),
    ...getShapeAt(enrich_execute_policy_request, 'path'),
    ...getShapeAt(enrich_execute_policy_request, 'query'),
  }),
  outputSchema: enrich_execute_policy_response,
};
