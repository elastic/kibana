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
 * Source: elasticsearch-specification repository, operations: security-get-service-accounts, security-get-service-accounts-1, security-get-service-accounts-2
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_get_service_accounts1_request,
  security_get_service_accounts1_response,
  security_get_service_accounts2_request,
  security_get_service_accounts2_response,
  security_get_service_accounts_request,
  security_get_service_accounts_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_GET_SERVICE_ACCOUNTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_service_accounts',
  connectorGroup: 'internal',
  summary: `Get service accounts`,
  description: `Get service accounts.

Get a list of service accounts that match the provided path parameters.

NOTE: Currently, only the \`elastic/fleet-server\` service account is available.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-service-accounts`,
  methods: ['GET'],
  patterns: [
    '_security/service/{namespace}/{service}',
    '_security/service/{namespace}',
    '_security/service',
  ],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-service-accounts',
  parameterTypes: {
    headerParams: [],
    pathParams: ['namespace', 'service'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_get_service_accounts_request, 'body'),
      ...getShapeAt(security_get_service_accounts_request, 'path'),
      ...getShapeAt(security_get_service_accounts_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_get_service_accounts1_request, 'body'),
      ...getShapeAt(security_get_service_accounts1_request, 'path'),
      ...getShapeAt(security_get_service_accounts1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_get_service_accounts2_request, 'body'),
      ...getShapeAt(security_get_service_accounts2_request, 'path'),
      ...getShapeAt(security_get_service_accounts2_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    security_get_service_accounts_response,
    security_get_service_accounts1_response,
    security_get_service_accounts2_response,
  ]),
};
