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
 * Source: elasticsearch-specification repository, operations: security-get-service-credentials
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_get_service_credentials_request,
  security_get_service_credentials_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_GET_SERVICE_CREDENTIALS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_service_credentials',
  summary: `Get service account credentials`,
  description: `Get service account credentials.

To use this API, you must have at least the \`read_security\` cluster privilege (or a greater privilege such as \`manage_service_account\` or \`manage_security\`).

The response includes service account tokens that were created with the create service account tokens API as well as file-backed tokens from all nodes of the cluster.

NOTE: For tokens backed by the \`service_tokens\` file, the API collects them from all nodes of the cluster.
Tokens with the same name from different nodes are assumed to be the same token and are only counted once towards the total number of service tokens.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-service-credentials`,
  methods: ['GET'],
  patterns: ['_security/service/{namespace}/{service}/credential'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-service-credentials',
  parameterTypes: {
    headerParams: [],
    pathParams: ['namespace', 'service'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_get_service_credentials_request, 'body'),
    ...getShapeAt(security_get_service_credentials_request, 'path'),
    ...getShapeAt(security_get_service_credentials_request, 'query'),
  }),
  outputSchema: security_get_service_credentials_response,
};
