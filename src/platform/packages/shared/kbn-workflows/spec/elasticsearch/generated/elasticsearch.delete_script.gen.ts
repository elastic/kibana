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
 * Source: elasticsearch-specification repository, operations: delete-script
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { delete_script_request, delete_script_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const DELETE_SCRIPT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.delete_script',
  summary: `Delete a script or search template`,
  description: `Delete a script or search template.

Deletes a stored script or search template.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-script`,
  methods: ['DELETE'],
  patterns: ['_scripts/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-script',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_script_request, 'body'),
    ...getShapeAt(delete_script_request, 'path'),
    ...getShapeAt(delete_script_request, 'query'),
  }),
  outputSchema: delete_script_response,
};
