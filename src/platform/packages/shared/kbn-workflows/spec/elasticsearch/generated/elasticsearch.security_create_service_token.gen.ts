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
 * Source: elasticsearch-specification repository, operations: security-create-service-token, security-create-service-token-1, security-create-service-token-2
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_create_service_token1_request,
  security_create_service_token1_response,
  security_create_service_token2_request,
  security_create_service_token2_response,
  security_create_service_token_request,
  security_create_service_token_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_CREATE_SERVICE_TOKEN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.create_service_token',
  summary: `Create a service account token`,
  description: `Create a service account token.

Create a service accounts token for access without requiring basic authentication.

NOTE: Service account tokens never expire.
You must actively delete them if they are no longer needed.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-service-token`,
  methods: ['PUT', 'POST'],
  patterns: [
    '_security/service/{namespace}/{service}/credential/token/{name}',
    '_security/service/{namespace}/{service}/credential/token',
  ],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-service-token',
  parameterTypes: {
    headerParams: [],
    pathParams: ['namespace', 'service', 'name'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_create_service_token_request, 'body'),
      ...getShapeAt(security_create_service_token_request, 'path'),
      ...getShapeAt(security_create_service_token_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_create_service_token1_request, 'body'),
      ...getShapeAt(security_create_service_token1_request, 'path'),
      ...getShapeAt(security_create_service_token1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_create_service_token2_request, 'body'),
      ...getShapeAt(security_create_service_token2_request, 'path'),
      ...getShapeAt(security_create_service_token2_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    security_create_service_token_response,
    security_create_service_token1_response,
    security_create_service_token2_response,
  ]),
};
