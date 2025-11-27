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
 * Source: elasticsearch-specification repository, operations: security-saml-authenticate
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_saml_authenticate_request,
  security_saml_authenticate_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_SAML_AUTHENTICATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.saml_authenticate',
  connectorGroup: 'internal',
  summary: `Authenticate SAML`,
  description: `Authenticate SAML.

Submit a SAML response message to Elasticsearch for consumption.

NOTE: This API is intended for use by custom web applications other than Kibana.
If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.

The SAML message that is submitted can be:

* A response to a SAML authentication request that was previously created using the SAML prepare authentication API.
* An unsolicited SAML message in the case of an IdP-initiated single sign-on (SSO) flow.

In either case, the SAML message needs to be a base64 encoded XML document with a root element of \`<Response>\`.

After successful validation, Elasticsearch responds with an Elasticsearch internal access token and refresh token that can be subsequently used for authentication.
This API endpoint essentially exchanges SAML responses that indicate successful authentication in the IdP for Elasticsearch access and refresh tokens, which can be used for authentication against Elasticsearch.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-authenticate`,
  methods: ['POST'],
  patterns: ['_security/saml/authenticate'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-authenticate',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['content', 'ids', 'realm'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_saml_authenticate_request, 'body'),
    ...getShapeAt(security_saml_authenticate_request, 'path'),
    ...getShapeAt(security_saml_authenticate_request, 'query'),
  }),
  outputSchema: security_saml_authenticate_response,
};
