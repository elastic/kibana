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
 * Source: elasticsearch-specification repository, operations: security-saml-prepare-authentication
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_saml_prepare_authentication_request,
  security_saml_prepare_authentication_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_SAML_PREPARE_AUTHENTICATION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.saml_prepare_authentication',
  connectorGroup: 'internal',
  summary: `Prepare SAML authentication`,
  description: `Prepare SAML authentication.

Create a SAML authentication request (\`<AuthnRequest>\`) as a URL string based on the configuration of the respective SAML realm in Elasticsearch.

NOTE: This API is intended for use by custom web applications other than Kibana.
If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.

This API returns a URL pointing to the SAML Identity Provider.
You can use the URL to redirect the browser of the user in order to continue the authentication process.
The URL includes a single parameter named \`SAMLRequest\`, which contains a SAML Authentication request that is deflated and Base64 encoded.
If the configuration dictates that SAML authentication requests should be signed, the URL has two extra parameters named \`SigAlg\` and \`Signature\`.
These parameters contain the algorithm used for the signature and the signature value itself.
It also returns a random string that uniquely identifies this SAML Authentication request.
The caller of this API needs to store this identifier as it needs to be used in a following step of the authentication process.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-prepare-authentication`,
  methods: ['POST'],
  patterns: ['_security/saml/prepare'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-prepare-authentication',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['acs', 'realm', 'relay_state'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_saml_prepare_authentication_request, 'body'),
    ...getShapeAt(security_saml_prepare_authentication_request, 'path'),
    ...getShapeAt(security_saml_prepare_authentication_request, 'query'),
  }),
  outputSchema: security_saml_prepare_authentication_response,
};
