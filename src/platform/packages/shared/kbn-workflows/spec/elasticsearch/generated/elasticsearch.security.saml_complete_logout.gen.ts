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
 * Source: elasticsearch-specification repository, operations: security-saml-complete-logout
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { security_saml_complete_logout_request } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_SAML_COMPLETE_LOGOUT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.saml_complete_logout',
  connectorGroup: 'internal',
  summary: `Logout of SAML completely`,
  description: `Logout of SAML completely.

Verifies the logout response sent from the SAML IdP.

NOTE: This API is intended for use by custom web applications other than Kibana.
If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.

The SAML IdP may send a logout response back to the SP after handling the SP-initiated SAML Single Logout.
This API verifies the response by ensuring the content is relevant and validating its signature.
An empty response is returned if the verification process is successful.
The response can be sent by the IdP with either the HTTP-Redirect or the HTTP-Post binding.
The caller of this API must prepare the request accordingly so that this API can handle either of them.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-complete-logout`,
  methods: ['POST'],
  patterns: ['_security/saml/complete_logout'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-complete-logout',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['realm', 'ids', 'query_string', 'content'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_saml_complete_logout_request, 'body'),
    ...getShapeAt(security_saml_complete_logout_request, 'path'),
    ...getShapeAt(security_saml_complete_logout_request, 'query'),
  }),
  outputSchema: z.optional(z.looseObject({})),
};
