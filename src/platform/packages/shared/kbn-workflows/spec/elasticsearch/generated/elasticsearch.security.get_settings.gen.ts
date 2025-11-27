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
 * Generated at: 2025-11-27T07:04:28.250Z
 * Source: elasticsearch-specification repository, operations: security-get-settings
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_get_settings_request,
  security_get_settings_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_GET_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_settings',
  connectorGroup: 'internal',
  summary: `Get security index settings`,
  description: `Get security index settings.

Get the user-configurable settings for the security internal index (\`.security\` and associated indices).
Only a subset of the index settings — those that are user-configurable—will be shown.
This includes:

* \`index.auto_expand_replicas\`
* \`index.number_of_replicas\`

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-settings`,
  methods: ['GET'],
  patterns: ['_security/settings'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-settings',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_get_settings_request, 'body'),
    ...getShapeAt(security_get_settings_request, 'path'),
    ...getShapeAt(security_get_settings_request, 'query'),
  }),
  outputSchema: security_get_settings_response,
};
