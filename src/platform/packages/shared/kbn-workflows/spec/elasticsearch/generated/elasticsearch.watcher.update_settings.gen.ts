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
 * Generated at: 2025-11-27T07:43:24.928Z
 * Source: elasticsearch-specification repository, operations: watcher-update-settings
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  watcher_update_settings_request,
  watcher_update_settings_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const WATCHER_UPDATE_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.update_settings',
  connectorGroup: 'internal',
  summary: `Update Watcher index settings`,
  description: `Update Watcher index settings.

Update settings for the Watcher internal index (\`.watches\`).
Only a subset of settings can be modified.
This includes \`index.auto_expand_replicas\`, \`index.number_of_replicas\`, \`index.routing.allocation.exclude.*\`,
\`index.routing.allocation.include.*\` and \`index.routing.allocation.require.*\`.
Modification of \`index.routing.allocation.include._tier_preference\` is an exception and is not allowed as the
Watcher shards must always be in the \`data_content\` tier.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-update-settings`,
  methods: ['PUT'],
  patterns: ['_watcher/settings'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-update-settings',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: ['index.auto_expand_replicas', 'index.number_of_replicas'],
  },
  paramsSchema: z.object({
    ...getShapeAt(watcher_update_settings_request, 'body'),
    ...getShapeAt(watcher_update_settings_request, 'path'),
    ...getShapeAt(watcher_update_settings_request, 'query'),
  }),
  outputSchema: watcher_update_settings_response,
};
