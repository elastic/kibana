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
 * Generated at: 2025-11-27T07:43:24.918Z
 * Source: elasticsearch-specification repository, operations: security-update-settings
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_update_settings_request,
  security_update_settings_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_UPDATE_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.update_settings',
  connectorGroup: 'internal',
  summary: `Update security index settings`,
  description: `Update security index settings.

Update the user-configurable settings for the security internal index (\`.security\` and associated indices). Only a subset of settings are allowed to be modified. This includes \`index.auto_expand_replicas\` and \`index.number_of_replicas\`.

NOTE: If \`index.auto_expand_replicas\` is set, \`index.number_of_replicas\` will be ignored during updates.

If a specific index is not in use on the system and settings are provided for it, the request will be rejected.
This API does not yet support configuring the settings for indices before they are in use.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-settings`,
  methods: ['PUT'],
  patterns: ['_security/settings'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-settings',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: ['security', 'security-profile', 'security-tokens'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_update_settings_request, 'body'),
    ...getShapeAt(security_update_settings_request, 'path'),
    ...getShapeAt(security_update_settings_request, 'query'),
  }),
  outputSchema: security_update_settings_response,
};
