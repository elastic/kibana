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
 * Generated at: 2025-11-27T07:43:24.917Z
 * Source: elasticsearch-specification repository, operations: security-suggest-user-profiles, security-suggest-user-profiles-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_suggest_user_profiles1_request,
  security_suggest_user_profiles1_response,
  security_suggest_user_profiles_request,
  security_suggest_user_profiles_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_SUGGEST_USER_PROFILES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.suggest_user_profiles',
  connectorGroup: 'internal',
  summary: `Suggest a user profile`,
  description: `Suggest a user profile.

Get suggestions for user profiles that match specified search criteria.

NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
Individual users and external applications should not call this API directly.
Elastic reserves the right to change or remove this feature in future releases without prior notice.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-suggest-user-profiles`,
  methods: ['GET', 'POST'],
  patterns: ['_security/profile/_suggest'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-suggest-user-profiles',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['data'],
    bodyParams: ['name', 'size', 'data', 'hint'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_suggest_user_profiles_request, 'body'),
      ...getShapeAt(security_suggest_user_profiles_request, 'path'),
      ...getShapeAt(security_suggest_user_profiles_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_suggest_user_profiles1_request, 'body'),
      ...getShapeAt(security_suggest_user_profiles1_request, 'path'),
      ...getShapeAt(security_suggest_user_profiles1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    security_suggest_user_profiles_response,
    security_suggest_user_profiles1_response,
  ]),
};
