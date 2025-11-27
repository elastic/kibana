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
 * Source: elasticsearch-specification repository, operations: get-script
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { get_script_request, get_script_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const GET_SCRIPT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.get_script',
  connectorGroup: 'internal',
  summary: `Get a script or search template`,
  description: `Get a script or search template.

Retrieves a stored script or search template.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get-script`,
  methods: ['GET'],
  patterns: ['_scripts/{id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get-script',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_script_request, 'body'),
    ...getShapeAt(get_script_request, 'path'),
    ...getShapeAt(get_script_request, 'query'),
  }),
  outputSchema: get_script_response,
};
