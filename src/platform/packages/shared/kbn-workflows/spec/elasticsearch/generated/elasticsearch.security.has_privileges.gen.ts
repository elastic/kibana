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
 * Generated at: 2025-11-27T07:04:28.251Z
 * Source: elasticsearch-specification repository, operations: security-has-privileges, security-has-privileges-1, security-has-privileges-2, security-has-privileges-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_has_privileges1_request,
  security_has_privileges1_response,
  security_has_privileges2_request,
  security_has_privileges2_response,
  security_has_privileges3_request,
  security_has_privileges3_response,
  security_has_privileges_request,
  security_has_privileges_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_HAS_PRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.has_privileges',
  connectorGroup: 'internal',
  summary: `Check user privileges`,
  description: `Check user privileges.

Determine whether the specified user has a specified list of privileges.
All users can use this API, but only to determine their own privileges.
To check the privileges of other users, you must use the run as feature.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-has-privileges`,
  methods: ['GET', 'POST'],
  patterns: ['_security/user/_has_privileges', '_security/user/{user}/_has_privileges'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-has-privileges',
  parameterTypes: {
    headerParams: [],
    pathParams: ['user'],
    urlParams: [],
    bodyParams: ['application', 'cluster', 'index'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_has_privileges_request, 'body'),
      ...getShapeAt(security_has_privileges_request, 'path'),
      ...getShapeAt(security_has_privileges_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_has_privileges1_request, 'body'),
      ...getShapeAt(security_has_privileges1_request, 'path'),
      ...getShapeAt(security_has_privileges1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_has_privileges2_request, 'body'),
      ...getShapeAt(security_has_privileges2_request, 'path'),
      ...getShapeAt(security_has_privileges2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_has_privileges3_request, 'body'),
      ...getShapeAt(security_has_privileges3_request, 'path'),
      ...getShapeAt(security_has_privileges3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    security_has_privileges_response,
    security_has_privileges1_response,
    security_has_privileges2_response,
    security_has_privileges3_response,
  ]),
};
