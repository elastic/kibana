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
 * Source: elasticsearch-specification repository, operations: watcher-delete-watch
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  watcher_delete_watch_request,
  watcher_delete_watch_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const WATCHER_DELETE_WATCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.delete_watch',
  summary: `Delete a watch`,
  description: `Delete a watch.

When the watch is removed, the document representing the watch in the \`.watches\` index is gone and it will never be run again.

Deleting a watch does not delete any watch execution records related to this watch from the watch history.

IMPORTANT: Deleting a watch must be done by using only this API.
Do not delete the watch directly from the \`.watches\` index using the Elasticsearch delete document API
When Elasticsearch security features are enabled, make sure no write privileges are granted to anyone for the \`.watches\` index.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-delete-watch`,
  methods: ['DELETE'],
  patterns: ['_watcher/watch/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-delete-watch',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(watcher_delete_watch_request, 'body'),
    ...getShapeAt(watcher_delete_watch_request, 'path'),
    ...getShapeAt(watcher_delete_watch_request, 'query'),
  }),
  outputSchema: watcher_delete_watch_response,
};
