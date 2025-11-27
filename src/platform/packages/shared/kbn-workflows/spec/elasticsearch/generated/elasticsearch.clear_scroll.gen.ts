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
 * Generated at: 2025-11-27T07:43:24.859Z
 * Source: elasticsearch-specification repository, operations: clear-scroll, clear-scroll-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  clear_scroll1_request,
  clear_scroll1_response,
  clear_scroll_request,
  clear_scroll_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLEAR_SCROLL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.clear_scroll',
  connectorGroup: 'internal',
  summary: `Clear a scrolling search`,
  description: `Clear a scrolling search.

Clear the search context and results for a scrolling search.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-clear-scroll`,
  methods: ['DELETE'],
  patterns: ['_search/scroll', '_search/scroll/{scroll_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-clear-scroll',
  parameterTypes: {
    headerParams: [],
    pathParams: ['scroll_id'],
    urlParams: [],
    bodyParams: ['scroll_id'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(clear_scroll_request, 'body'),
      ...getShapeAt(clear_scroll_request, 'path'),
      ...getShapeAt(clear_scroll_request, 'query'),
    }),
    z.object({
      ...getShapeAt(clear_scroll1_request, 'body'),
      ...getShapeAt(clear_scroll1_request, 'path'),
      ...getShapeAt(clear_scroll1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([clear_scroll_response, clear_scroll1_response]),
};
