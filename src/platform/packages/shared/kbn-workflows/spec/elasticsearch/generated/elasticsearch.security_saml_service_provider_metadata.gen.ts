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
 * Source: elasticsearch-specification repository, operations: security-saml-service-provider-metadata
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_saml_service_provider_metadata_request,
  security_saml_service_provider_metadata_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_SAML_SERVICE_PROVIDER_METADATA_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.saml_service_provider_metadata',
  summary: `Create SAML service provider metadata`,
  description: `Create SAML service provider metadata.

Generate SAML metadata for a SAML 2.0 Service Provider.

The SAML 2.0 specification provides a mechanism for Service Providers to describe their capabilities and configuration using a metadata file.
This API generates Service Provider metadata based on the configuration of a SAML realm in Elasticsearch.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-service-provider-metadata`,
  methods: ['GET'],
  patterns: ['_security/saml/metadata/{realm_name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-service-provider-metadata',
  parameterTypes: {
    headerParams: [],
    pathParams: ['realm_name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_saml_service_provider_metadata_request, 'body'),
    ...getShapeAt(security_saml_service_provider_metadata_request, 'path'),
    ...getShapeAt(security_saml_service_provider_metadata_request, 'query'),
  }),
  outputSchema: security_saml_service_provider_metadata_response,
};
