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
 * Generated at: 2025-11-27T07:04:28.261Z
 * Source: elasticsearch-specification repository, operations: watcher-deactivate-watch, watcher-deactivate-watch-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  watcher_deactivate_watch1_request,
  watcher_deactivate_watch1_response,
  watcher_deactivate_watch_request,
  watcher_deactivate_watch_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const WATCHER_DEACTIVATE_WATCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.deactivate_watch',
  connectorGroup: 'internal',
  summary: `Deactivate a watch`,
  description: `Deactivate a watch.

A watch can be either active or inactive.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-deactivate-watch`,
  methods: ['PUT', 'POST'],
  patterns: ['_watcher/watch/{watch_id}/_deactivate'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-deactivate-watch',
  parameterTypes: {
    headerParams: [],
    pathParams: ['watch_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(watcher_deactivate_watch_request, 'body'),
      ...getShapeAt(watcher_deactivate_watch_request, 'path'),
      ...getShapeAt(watcher_deactivate_watch_request, 'query'),
    }),
    z.object({
      ...getShapeAt(watcher_deactivate_watch1_request, 'body'),
      ...getShapeAt(watcher_deactivate_watch1_request, 'path'),
      ...getShapeAt(watcher_deactivate_watch1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([watcher_deactivate_watch_response, watcher_deactivate_watch1_response]),
};
