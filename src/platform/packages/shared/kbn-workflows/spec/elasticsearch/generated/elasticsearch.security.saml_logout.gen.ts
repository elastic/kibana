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
 * Generated at: 2025-11-27T07:04:28.253Z
 * Source: elasticsearch-specification repository, operations: security-saml-logout
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { security_saml_logout_request, security_saml_logout_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_SAML_LOGOUT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.saml_logout',
  connectorGroup: 'internal',
  summary: `Logout of SAML`,
  description: `Logout of SAML.

Submits a request to invalidate an access token and refresh token.

NOTE: This API is intended for use by custom web applications other than Kibana.
If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.

This API invalidates the tokens that were generated for a user by the SAML authenticate API.
If the SAML realm in Elasticsearch is configured accordingly and the SAML IdP supports this, the Elasticsearch response contains a URL to redirect the user to the IdP that contains a SAML logout request (starting an SP-initiated SAML Single Logout).

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-logout`,
  methods: ['POST'],
  patterns: ['_security/saml/logout'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-logout',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['token', 'refresh_token'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_saml_logout_request, 'body'),
    ...getShapeAt(security_saml_logout_request, 'path'),
    ...getShapeAt(security_saml_logout_request, 'query'),
  }),
  outputSchema: security_saml_logout_response,
};
