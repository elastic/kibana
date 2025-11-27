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
 * Generated at: 2025-11-27T07:04:28.248Z
 * Source: elasticsearch-specification repository, operations: security-delete-privileges
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_delete_privileges_request,
  security_delete_privileges_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_DELETE_PRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.delete_privileges',
  connectorGroup: 'internal',
  summary: `Delete application privileges`,
  description: `Delete application privileges.

To use this API, you must have one of the following privileges:

* The \`manage_security\` cluster privilege (or a greater privilege such as \`all\`).
* The "Manage Application Privileges" global privilege for the application being referenced in the request.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-privileges`,
  methods: ['DELETE'],
  patterns: ['_security/privilege/{application}/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-privileges',
  parameterTypes: {
    headerParams: [],
    pathParams: ['application', 'name'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_delete_privileges_request, 'body'),
    ...getShapeAt(security_delete_privileges_request, 'path'),
    ...getShapeAt(security_delete_privileges_request, 'query'),
  }),
  outputSchema: security_delete_privileges_response,
};
