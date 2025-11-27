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
 * Generated at: 2025-11-27T07:04:28.242Z
 * Source: elasticsearch-specification repository, operations: put-script, put-script-1, put-script-2, put-script-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  put_script1_request,
  put_script1_response,
  put_script2_request,
  put_script2_response,
  put_script3_request,
  put_script3_response,
  put_script_request,
  put_script_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const PUT_SCRIPT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.put_script',
  connectorGroup: 'internal',
  summary: `Create or update a script or search template`,
  description: `Create or update a script or search template.

Creates or updates a stored script or search template.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-put-script`,
  methods: ['PUT', 'POST'],
  patterns: ['_scripts/{id}', '_scripts/{id}/{context}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-put-script',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id', 'context'],
    urlParams: ['context', 'master_timeout', 'timeout'],
    bodyParams: ['script'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(put_script_request, 'body'),
      ...getShapeAt(put_script_request, 'path'),
      ...getShapeAt(put_script_request, 'query'),
    }),
    z.object({
      ...getShapeAt(put_script1_request, 'body'),
      ...getShapeAt(put_script1_request, 'path'),
      ...getShapeAt(put_script1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(put_script2_request, 'body'),
      ...getShapeAt(put_script2_request, 'path'),
      ...getShapeAt(put_script2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(put_script3_request, 'body'),
      ...getShapeAt(put_script3_request, 'path'),
      ...getShapeAt(put_script3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    put_script_response,
    put_script1_response,
    put_script2_response,
    put_script3_response,
  ]),
};
