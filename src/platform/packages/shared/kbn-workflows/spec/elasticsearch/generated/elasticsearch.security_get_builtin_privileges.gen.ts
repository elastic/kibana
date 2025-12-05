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
 * Source: elasticsearch-specification repository, operations: security-get-builtin-privileges
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_get_builtin_privileges_request,
  security_get_builtin_privileges_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_GET_BUILTIN_PRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_builtin_privileges',
  summary: `Get builtin privileges`,
  description: `Get builtin privileges.

Get the list of cluster privileges and index privileges that are available in this version of Elasticsearch.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-builtin-privileges`,
  methods: ['GET'],
  patterns: ['_security/privilege/_builtin'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-builtin-privileges',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_get_builtin_privileges_request, 'body'),
    ...getShapeAt(security_get_builtin_privileges_request, 'path'),
    ...getShapeAt(security_get_builtin_privileges_request, 'query'),
  }),
  outputSchema: security_get_builtin_privileges_response,
};
