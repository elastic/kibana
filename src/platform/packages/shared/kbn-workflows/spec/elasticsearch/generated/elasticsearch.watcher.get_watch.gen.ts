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
 * Source: elasticsearch-specification repository, operations: watcher-get-watch
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { watcher_get_watch_request, watcher_get_watch_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const WATCHER_GET_WATCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.get_watch',
  connectorGroup: 'internal',
  summary: `Get a watch`,
  description: `Get a watch.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-get-watch`,
  methods: ['GET'],
  patterns: ['_watcher/watch/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-get-watch',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(watcher_get_watch_request, 'body'),
    ...getShapeAt(watcher_get_watch_request, 'path'),
    ...getShapeAt(watcher_get_watch_request, 'query'),
  }),
  outputSchema: watcher_get_watch_response,
};
