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
 * Generated at: 2025-11-27T07:04:28.262Z
 * Source: elasticsearch-specification repository, operations: watcher-stop
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { watcher_stop_request, watcher_stop_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const WATCHER_STOP_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.stop',
  connectorGroup: 'internal',
  summary: `Stop the watch service`,
  description: `Stop the watch service.

Stop the Watcher service if it is running.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-stop`,
  methods: ['POST'],
  patterns: ['_watcher/_stop'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-stop',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(watcher_stop_request, 'body'),
    ...getShapeAt(watcher_stop_request, 'path'),
    ...getShapeAt(watcher_stop_request, 'query'),
  }),
  outputSchema: watcher_stop_response,
};
