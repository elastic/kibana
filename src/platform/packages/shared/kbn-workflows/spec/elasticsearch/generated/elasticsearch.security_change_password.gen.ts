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
 * Source: elasticsearch-specification repository, operations: security-change-password, security-change-password-1, security-change-password-2, security-change-password-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_change_password1_request,
  security_change_password1_response,
  security_change_password2_request,
  security_change_password2_response,
  security_change_password3_request,
  security_change_password3_response,
  security_change_password_request,
  security_change_password_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_CHANGE_PASSWORD_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.change_password',
  summary: `Change passwords`,
  description: `Change passwords.

Change the passwords of users in the native realm and built-in users.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-change-password`,
  methods: ['PUT', 'POST'],
  patterns: ['_security/user/{username}/_password', '_security/user/_password'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-change-password',
  parameterTypes: {
    headerParams: [],
    pathParams: ['username'],
    urlParams: ['refresh'],
    bodyParams: ['password', 'password_hash'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_change_password_request, 'body'),
      ...getShapeAt(security_change_password_request, 'path'),
      ...getShapeAt(security_change_password_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_change_password1_request, 'body'),
      ...getShapeAt(security_change_password1_request, 'path'),
      ...getShapeAt(security_change_password1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_change_password2_request, 'body'),
      ...getShapeAt(security_change_password2_request, 'path'),
      ...getShapeAt(security_change_password2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_change_password3_request, 'body'),
      ...getShapeAt(security_change_password3_request, 'path'),
      ...getShapeAt(security_change_password3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    security_change_password_response,
    security_change_password1_response,
    security_change_password2_response,
    security_change_password3_response,
  ]),
};
