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
 * Generated at: 2025-11-27T07:43:24.927Z
 * Source: elasticsearch-specification repository, operations: watcher-get-settings
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { watcher_get_settings_request, watcher_get_settings_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const WATCHER_GET_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.get_settings',
  connectorGroup: 'internal',
  summary: `Get Watcher index settings`,
  description: `Get Watcher index settings.

Get settings for the Watcher internal index (\`.watches\`).
Only a subset of settings are shown, for example \`index.auto_expand_replicas\` and \`index.number_of_replicas\`.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-get-settings`,
  methods: ['GET'],
  patterns: ['_watcher/settings'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-get-settings',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(watcher_get_settings_request, 'body'),
    ...getShapeAt(watcher_get_settings_request, 'path'),
    ...getShapeAt(watcher_get_settings_request, 'query'),
  }),
  outputSchema: watcher_get_settings_response,
};
