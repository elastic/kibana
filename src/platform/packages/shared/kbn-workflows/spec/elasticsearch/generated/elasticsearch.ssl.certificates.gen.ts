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
 * Source: elasticsearch-specification repository, operations: ssl-certificates
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ssl_certificates_request, ssl_certificates_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SSL_CERTIFICATES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ssl.certificates',
  summary: `Get SSL certificates`,
  description: `Get SSL certificates.

Get information about the X.509 certificates that are used to encrypt communications in the cluster.
The API returns a list that includes certificates from all TLS contexts including:

- Settings for transport and HTTP interfaces
- TLS settings that are used within authentication realms
- TLS settings for remote monitoring exporters

The list includes certificates that are used for configuring trust, such as those configured in the \`xpack.security.transport.ssl.truststore\` and \`xpack.security.transport.ssl.certificate_authorities\` settings.
It also includes certificates that are used for configuring server identity, such as \`xpack.security.http.ssl.keystore\` and \`xpack.security.http.ssl.certificate settings\`.

The list does not include certificates that are sourced from the default SSL context of the Java Runtime Environment (JRE), even if those certificates are in use within Elasticsearch.

NOTE: When a PKCS#11 token is configured as the truststore of the JRE, the API returns all the certificates that are included in the PKCS#11 token irrespective of whether these are used in the Elasticsearch TLS configuration.

If Elasticsearch is configured to use a keystore or truststore, the API output includes all certificates in that store, even though some of the certificates might not be in active use within the cluster.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ssl-certificates`,
  methods: ['GET'],
  patterns: ['_ssl/certificates'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ssl-certificates',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ssl_certificates_request, 'body'),
    ...getShapeAt(ssl_certificates_request, 'path'),
    ...getShapeAt(ssl_certificates_request, 'query'),
  }),
  outputSchema: ssl_certificates_response,
};
