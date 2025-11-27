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
 * Source: elasticsearch-specification repository, operations: security-saml-invalidate
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_saml_invalidate_request,
  security_saml_invalidate_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_SAML_INVALIDATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.saml_invalidate',
  connectorGroup: 'internal',
  summary: `Invalidate SAML`,
  description: `Invalidate SAML.

Submit a SAML LogoutRequest message to Elasticsearch for consumption.

NOTE: This API is intended for use by custom web applications other than Kibana.
If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.

The logout request comes from the SAML IdP during an IdP initiated Single Logout.
The custom web application can use this API to have Elasticsearch process the \`LogoutRequest\`.
After successful validation of the request, Elasticsearch invalidates the access token and refresh token that corresponds to that specific SAML principal and provides a URL that contains a SAML LogoutResponse message.
Thus the user can be redirected back to their IdP.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-invalidate`,
  methods: ['POST'],
  patterns: ['_security/saml/invalidate'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-invalidate',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['acs', 'query_string', 'realm'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_saml_invalidate_request, 'body'),
    ...getShapeAt(security_saml_invalidate_request, 'path'),
    ...getShapeAt(security_saml_invalidate_request, 'query'),
  }),
  outputSchema: security_saml_invalidate_response,
};
