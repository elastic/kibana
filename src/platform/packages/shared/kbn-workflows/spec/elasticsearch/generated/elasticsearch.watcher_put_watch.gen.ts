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
 * Source: elasticsearch-specification repository, operations: watcher-put-watch, watcher-put-watch-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  watcher_put_watch1_request,
  watcher_put_watch1_response,
  watcher_put_watch_request,
  watcher_put_watch_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const WATCHER_PUT_WATCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.put_watch',
  summary: `Create or update a watch`,
  description: `Create or update a watch.

When a watch is registered, a new document that represents the watch is added to the \`.watches\` index and its trigger is immediately registered with the relevant trigger engine.
Typically for the \`schedule\` trigger, the scheduler is the trigger engine.

IMPORTANT: You must use Kibana or this API to create a watch.
Do not add a watch directly to the \`.watches\` index by using the Elasticsearch index API.
If Elasticsearch security features are enabled, do not give users write privileges on the \`.watches\` index.

When you add a watch you can also define its initial active state by setting the *active* parameter.

When Elasticsearch security features are enabled, your watch can index or search only on indices for which the user that stored the watch has privileges.
If the user is able to read index \`a\`, but not index \`b\`, the same will apply when the watch runs.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-put-watch`,
  methods: ['PUT', 'POST'],
  patterns: ['_watcher/watch/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-put-watch',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['active', 'if_primary_term', 'if_seq_no', 'version'],
    bodyParams: [
      'actions',
      'condition',
      'input',
      'metadata',
      'throttle_period',
      'throttle_period_in_millis',
      'transform',
      'trigger',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(watcher_put_watch_request, 'body'),
      ...getShapeAt(watcher_put_watch_request, 'path'),
      ...getShapeAt(watcher_put_watch_request, 'query'),
    }),
    z.object({
      ...getShapeAt(watcher_put_watch1_request, 'body'),
      ...getShapeAt(watcher_put_watch1_request, 'path'),
      ...getShapeAt(watcher_put_watch1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([watcher_put_watch_response, watcher_put_watch1_response]),
};
