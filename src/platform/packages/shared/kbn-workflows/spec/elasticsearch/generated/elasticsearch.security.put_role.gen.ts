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
 * Generated at: 2025-11-27T07:43:24.916Z
 * Source: elasticsearch-specification repository, operations: security-put-role, security-put-role-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_put_role1_request,
  security_put_role1_response,
  security_put_role_request,
  security_put_role_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_PUT_ROLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.put_role',
  connectorGroup: 'internal',
  summary: `Create or update roles`,
  description: `Create or update roles.

The role management APIs are generally the preferred way to manage roles in the native realm, rather than using file-based role management.
The create or update roles API cannot update roles that are defined in roles files.
File-based role management is not available in Elastic Serverless.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-role`,
  methods: ['PUT', 'POST'],
  patterns: ['_security/role/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-role',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['refresh'],
    bodyParams: [
      'applications',
      'cluster',
      'global',
      'indices',
      'remote_indices',
      'remote_cluster',
      'metadata',
      'run_as',
      'description',
      'transient_metadata',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_put_role_request, 'body'),
      ...getShapeAt(security_put_role_request, 'path'),
      ...getShapeAt(security_put_role_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_put_role1_request, 'body'),
      ...getShapeAt(security_put_role1_request, 'path'),
      ...getShapeAt(security_put_role1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([security_put_role_response, security_put_role1_response]),
};
