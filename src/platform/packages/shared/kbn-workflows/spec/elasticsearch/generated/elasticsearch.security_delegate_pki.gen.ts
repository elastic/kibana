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
 * Source: elasticsearch-specification repository, operations: security-delegate-pki
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_delegate_pki_request,
  security_delegate_pki_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_DELEGATE_PKI_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.delegate_pki',
  summary: `Delegate PKI authentication`,
  description: `Delegate PKI authentication.

This API implements the exchange of an X509Certificate chain for an Elasticsearch access token.
The certificate chain is validated, according to RFC 5280, by sequentially considering the trust configuration of every installed PKI realm that has \`delegation.enabled\` set to \`true\`.
A successfully trusted client certificate is also subject to the validation of the subject distinguished name according to thw \`username_pattern\` of the respective realm.

This API is called by smart and trusted proxies, such as Kibana, which terminate the user's TLS session but still want to authenticate the user by using a PKI realm—-​as if the user connected directly to Elasticsearch.

IMPORTANT: The association between the subject public key in the target certificate and the corresponding private key is not validated.
This is part of the TLS authentication process and it is delegated to the proxy that calls this API.
The proxy is trusted to have performed the TLS authentication and this API translates that authentication into an Elasticsearch access token.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delegate-pki`,
  methods: ['POST'],
  patterns: ['_security/delegate_pki'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delegate-pki',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['x509_certificate_chain'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_delegate_pki_request, 'body'),
    ...getShapeAt(security_delegate_pki_request, 'path'),
    ...getShapeAt(security_delegate_pki_request, 'query'),
  }),
  outputSchema: security_delegate_pki_response,
};
