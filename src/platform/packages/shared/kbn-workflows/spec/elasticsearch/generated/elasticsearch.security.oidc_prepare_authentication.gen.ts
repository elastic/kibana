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
 * Generated at: 2025-11-27T07:04:28.252Z
 * Source: elasticsearch-specification repository, operations: security-oidc-prepare-authentication
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_oidc_prepare_authentication_request,
  security_oidc_prepare_authentication_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_OIDC_PREPARE_AUTHENTICATION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.oidc_prepare_authentication',
  connectorGroup: 'internal',
  summary: `Prepare OpenID connect authentication`,
  description: `Prepare OpenID connect authentication.

Create an oAuth 2.0 authentication request as a URL string based on the configuration of the OpenID Connect authentication realm in Elasticsearch.

The response of this API is a URL pointing to the Authorization Endpoint of the configured OpenID Connect Provider, which can be used to redirect the browser of the user in order to continue the authentication process.

Elasticsearch exposes all the necessary OpenID Connect related functionality with the OpenID Connect APIs.
These APIs are used internally by Kibana in order to provide OpenID Connect based authentication, but can also be used by other, custom web applications or other clients.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-oidc-prepare-authentication`,
  methods: ['POST'],
  patterns: ['_security/oidc/prepare'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-oidc-prepare-authentication',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['iss', 'login_hint', 'nonce', 'realm', 'state'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_oidc_prepare_authentication_request, 'body'),
    ...getShapeAt(security_oidc_prepare_authentication_request, 'path'),
    ...getShapeAt(security_oidc_prepare_authentication_request, 'query'),
  }),
  outputSchema: security_oidc_prepare_authentication_response,
};
