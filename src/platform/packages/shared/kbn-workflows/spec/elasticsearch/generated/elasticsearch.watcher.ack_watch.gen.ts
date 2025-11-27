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
 * Source: elasticsearch-specification repository, operations: watcher-ack-watch, watcher-ack-watch-1, watcher-ack-watch-2, watcher-ack-watch-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  watcher_ack_watch1_request,
  watcher_ack_watch1_response,
  watcher_ack_watch2_request,
  watcher_ack_watch2_response,
  watcher_ack_watch3_request,
  watcher_ack_watch3_response,
  watcher_ack_watch_request,
  watcher_ack_watch_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const WATCHER_ACK_WATCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.ack_watch',
  connectorGroup: 'internal',
  summary: `Acknowledge a watch`,
  description: `Acknowledge a watch.

Acknowledging a watch enables you to manually throttle the execution of the watch's actions.

The acknowledgement state of an action is stored in the \`status.actions.<id>.ack.state\` structure.

IMPORTANT: If the specified watch is currently being executed, this API will return an error
The reason for this behavior is to prevent overwriting the watch status from a watch execution.

Acknowledging an action throttles further executions of that action until its \`ack.state\` is reset to \`awaits_successful_execution\`.
This happens when the condition of the watch is not met (the condition evaluates to false).
To demonstrate how throttling works in practice and how it can be configured for individual actions within a watch, refer to External documentation.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-ack-watch`,
  methods: ['PUT', 'POST'],
  patterns: ['_watcher/watch/{watch_id}/_ack', '_watcher/watch/{watch_id}/_ack/{action_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-ack-watch',
  parameterTypes: {
    headerParams: [],
    pathParams: ['watch_id', 'action_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(watcher_ack_watch_request, 'body'),
      ...getShapeAt(watcher_ack_watch_request, 'path'),
      ...getShapeAt(watcher_ack_watch_request, 'query'),
    }),
    z.object({
      ...getShapeAt(watcher_ack_watch1_request, 'body'),
      ...getShapeAt(watcher_ack_watch1_request, 'path'),
      ...getShapeAt(watcher_ack_watch1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(watcher_ack_watch2_request, 'body'),
      ...getShapeAt(watcher_ack_watch2_request, 'path'),
      ...getShapeAt(watcher_ack_watch2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(watcher_ack_watch3_request, 'body'),
      ...getShapeAt(watcher_ack_watch3_request, 'path'),
      ...getShapeAt(watcher_ack_watch3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    watcher_ack_watch_response,
    watcher_ack_watch1_response,
    watcher_ack_watch2_response,
    watcher_ack_watch3_response,
  ]),
};
