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
 * Source: elasticsearch-specification repository, operations: watcher-execute-watch, watcher-execute-watch-1, watcher-execute-watch-2, watcher-execute-watch-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  watcher_execute_watch1_request,
  watcher_execute_watch1_response,
  watcher_execute_watch2_request,
  watcher_execute_watch2_response,
  watcher_execute_watch3_request,
  watcher_execute_watch3_response,
  watcher_execute_watch_request,
  watcher_execute_watch_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const WATCHER_EXECUTE_WATCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.execute_watch',
  connectorGroup: 'internal',
  summary: `Run a watch`,
  description: `Run a watch.

This API can be used to force execution of the watch outside of its triggering logic or to simulate the watch execution for debugging purposes.

For testing and debugging purposes, you also have fine-grained control on how the watch runs.
You can run the watch without running all of its actions or alternatively by simulating them.
You can also force execution by ignoring the watch condition and control whether a watch record would be written to the watch history after it runs.

You can use the run watch API to run watches that are not yet registered by specifying the watch definition inline.
This serves as great tool for testing and debugging your watches prior to adding them to Watcher.

When Elasticsearch security features are enabled on your cluster, watches are run with the privileges of the user that stored the watches.
If your user is allowed to read index \`a\`, but not index \`b\`, then the exact same set of rules will apply during execution of a watch.

When using the run watch API, the authorization data of the user that called the API will be used as a base, instead of the information who stored the watch.
Refer to the external documentation for examples of watch execution requests, including existing, customized, and inline watches.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-execute-watch`,
  methods: ['PUT', 'POST'],
  patterns: ['_watcher/watch/{id}/_execute', '_watcher/watch/_execute'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-execute-watch',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['debug'],
    bodyParams: [
      'action_modes',
      'alternative_input',
      'ignore_condition',
      'record_execution',
      'simulated_actions',
      'trigger_data',
      'watch',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(watcher_execute_watch_request, 'body'),
      ...getShapeAt(watcher_execute_watch_request, 'path'),
      ...getShapeAt(watcher_execute_watch_request, 'query'),
    }),
    z.object({
      ...getShapeAt(watcher_execute_watch1_request, 'body'),
      ...getShapeAt(watcher_execute_watch1_request, 'path'),
      ...getShapeAt(watcher_execute_watch1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(watcher_execute_watch2_request, 'body'),
      ...getShapeAt(watcher_execute_watch2_request, 'path'),
      ...getShapeAt(watcher_execute_watch2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(watcher_execute_watch3_request, 'body'),
      ...getShapeAt(watcher_execute_watch3_request, 'path'),
      ...getShapeAt(watcher_execute_watch3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    watcher_execute_watch_response,
    watcher_execute_watch1_response,
    watcher_execute_watch2_response,
    watcher_execute_watch3_response,
  ]),
};
