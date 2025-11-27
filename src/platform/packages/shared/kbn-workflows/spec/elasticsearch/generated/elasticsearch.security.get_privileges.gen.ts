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
 * Generated at: 2025-11-27T07:04:28.250Z
 * Source: elasticsearch-specification repository, operations: security-get-privileges, security-get-privileges-1, security-get-privileges-2
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_get_privileges1_request,
  security_get_privileges1_response,
  security_get_privileges2_request,
  security_get_privileges2_response,
  security_get_privileges_request,
  security_get_privileges_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_GET_PRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_privileges',
  connectorGroup: 'internal',
  summary: `Get application privileges`,
  description: `Get application privileges.

To use this API, you must have one of the following privileges:

* The \`read_security\` cluster privilege (or a greater privilege such as \`manage_security\` or \`all\`).
* The "Manage Application Privileges" global privilege for the application being referenced in the request.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-privileges`,
  methods: ['GET'],
  patterns: [
    '_security/privilege',
    '_security/privilege/{application}',
    '_security/privilege/{application}/{name}',
  ],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-privileges',
  parameterTypes: {
    headerParams: [],
    pathParams: ['application', 'name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_get_privileges_request, 'body'),
      ...getShapeAt(security_get_privileges_request, 'path'),
      ...getShapeAt(security_get_privileges_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_get_privileges1_request, 'body'),
      ...getShapeAt(security_get_privileges1_request, 'path'),
      ...getShapeAt(security_get_privileges1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_get_privileges2_request, 'body'),
      ...getShapeAt(security_get_privileges2_request, 'path'),
      ...getShapeAt(security_get_privileges2_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    security_get_privileges_response,
    security_get_privileges1_response,
    security_get_privileges2_response,
  ]),
};
