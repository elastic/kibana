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
 * Generated at: 2025-11-27T07:43:24.914Z
 * Source: elasticsearch-specification repository, operations: security-get-user, security-get-user-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_get_user1_request,
  security_get_user1_response,
  security_get_user_request,
  security_get_user_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_GET_USER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_user',
  connectorGroup: 'internal',
  summary: `Get users`,
  description: `Get users.

Get information about users in the native realm and built-in users.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-user`,
  methods: ['GET'],
  patterns: ['_security/user/{username}', '_security/user'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-user',
  parameterTypes: {
    headerParams: [],
    pathParams: ['username'],
    urlParams: ['with_profile_uid'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_get_user_request, 'body'),
      ...getShapeAt(security_get_user_request, 'path'),
      ...getShapeAt(security_get_user_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_get_user1_request, 'body'),
      ...getShapeAt(security_get_user1_request, 'path'),
      ...getShapeAt(security_get_user1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([security_get_user_response, security_get_user1_response]),
};
