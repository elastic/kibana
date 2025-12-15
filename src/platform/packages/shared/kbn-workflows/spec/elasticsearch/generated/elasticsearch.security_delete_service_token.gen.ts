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
 * Source: elasticsearch-specification repository, operations: security-delete-service-token
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_delete_service_token_request,
  security_delete_service_token_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_DELETE_SERVICE_TOKEN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.delete_service_token',
  summary: `Delete service account tokens`,
  description: `Delete service account tokens.

Delete service account tokens for a service in a specified namespace.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-service-token`,
  methods: ['DELETE'],
  patterns: ['_security/service/{namespace}/{service}/credential/token/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-service-token',
  parameterTypes: {
    headerParams: [],
    pathParams: ['namespace', 'service', 'name'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_delete_service_token_request, 'body'),
    ...getShapeAt(security_delete_service_token_request, 'path'),
    ...getShapeAt(security_delete_service_token_request, 'query'),
  }),
  outputSchema: security_delete_service_token_response,
};
