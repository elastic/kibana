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
 * Generated at: 2025-11-27T07:43:24.860Z
 * Source: elasticsearch-specification repository, operations: close-point-in-time
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { close_point_in_time_request, close_point_in_time_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLOSE_POINT_IN_TIME_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.close_point_in_time',
  connectorGroup: 'internal',
  summary: `Close a point in time`,
  description: `Close a point in time.

A point in time must be opened explicitly before being used in search requests.
The \`keep_alive\` parameter tells Elasticsearch how long it should persist.
A point in time is automatically closed when the \`keep_alive\` period has elapsed.
However, keeping points in time has a cost; close them as soon as they are no longer required for search requests.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-open-point-in-time`,
  methods: ['DELETE'],
  patterns: ['_pit'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-open-point-in-time',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['id'],
  },
  paramsSchema: z.object({
    ...getShapeAt(close_point_in_time_request, 'body'),
    ...getShapeAt(close_point_in_time_request, 'path'),
    ...getShapeAt(close_point_in_time_request, 'query'),
  }),
  outputSchema: close_point_in_time_response,
};
