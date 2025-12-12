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
 * Source: elasticsearch-specification repository, operations: watcher-start
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { watcher_start_request, watcher_start_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const WATCHER_START_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.start',
  summary: `Start the watch service`,
  description: `Start the watch service.

Start the Watcher service if it is not already running.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-start`,
  methods: ['POST'],
  patterns: ['_watcher/_start'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-start',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(watcher_start_request, 'body'),
    ...getShapeAt(watcher_start_request, 'path'),
    ...getShapeAt(watcher_start_request, 'query'),
  }),
  outputSchema: watcher_start_response,
};
