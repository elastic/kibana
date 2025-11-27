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
 * Generated at: 2025-11-27T07:43:24.871Z
 * Source: elasticsearch-specification repository, operations: get-script-context
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { get_script_context_request, get_script_context_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const GET_SCRIPT_CONTEXT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.get_script_context',
  connectorGroup: 'internal',
  summary: `Get script contexts`,
  description: `Get script contexts.

Get a list of supported script contexts and their methods.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get-script-context`,
  methods: ['GET'],
  patterns: ['_script_context'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get-script-context',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_script_context_request, 'body'),
    ...getShapeAt(get_script_context_request, 'path'),
    ...getShapeAt(get_script_context_request, 'query'),
  }),
  outputSchema: get_script_context_response,
};
