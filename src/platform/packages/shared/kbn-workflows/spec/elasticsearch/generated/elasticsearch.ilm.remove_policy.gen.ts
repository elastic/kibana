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
 * Generated at: 2025-11-27T07:04:28.212Z
 * Source: elasticsearch-specification repository, operations: ilm-remove-policy
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ilm_remove_policy_request, ilm_remove_policy_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ILM_REMOVE_POLICY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.remove_policy',
  connectorGroup: 'internal',
  summary: `Remove policies from an index`,
  description: `Remove policies from an index.

Remove the assigned lifecycle policies from an index or a data stream's backing indices.
It also stops managing the indices.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-remove-policy`,
  methods: ['POST'],
  patterns: ['{index}/_ilm/remove'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-remove-policy',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ilm_remove_policy_request, 'body'),
    ...getShapeAt(ilm_remove_policy_request, 'path'),
    ...getShapeAt(ilm_remove_policy_request, 'query'),
  }),
  outputSchema: ilm_remove_policy_response,
};
