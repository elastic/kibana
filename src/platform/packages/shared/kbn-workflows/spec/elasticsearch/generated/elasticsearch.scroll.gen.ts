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
 * Generated at: 2025-11-27T07:43:24.907Z
 * Source: elasticsearch-specification repository, operations: scroll, scroll-1, scroll-2, scroll-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  scroll1_request,
  scroll1_response,
  scroll2_request,
  scroll2_response,
  scroll3_request,
  scroll3_response,
  scroll_request,
  scroll_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SCROLL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.scroll',
  connectorGroup: 'internal',
  summary: `Run a scrolling search`,
  description: `Run a scrolling search.

IMPORTANT: The scroll API is no longer recommend for deep pagination. If you need to preserve the index state while paging through more than 10,000 hits, use the \`search_after\` parameter with a point in time (PIT).

The scroll API gets large sets of results from a single scrolling search request.
To get the necessary scroll ID, submit a search API request that includes an argument for the \`scroll\` query parameter.
The \`scroll\` parameter indicates how long Elasticsearch should retain the search context for the request.
The search response returns a scroll ID in the \`_scroll_id\` response body parameter.
You can then use the scroll ID with the scroll API to retrieve the next batch of results for the request.
If the Elasticsearch security features are enabled, the access to the results of a specific scroll ID is restricted to the user or API key that submitted the search.

You can also use the scroll API to specify a new scroll parameter that extends or shortens the retention period for the search context.

IMPORTANT: Results from a scrolling search reflect the state of the index at the time of the initial search request. Subsequent indexing or document changes only affect later search and scroll requests.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-scroll`,
  methods: ['GET', 'POST'],
  patterns: ['_search/scroll', '_search/scroll/{scroll_id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-scroll',
  parameterTypes: {
    headerParams: [],
    pathParams: ['scroll_id'],
    urlParams: ['scroll', 'scroll_id', 'rest_total_hits_as_int'],
    bodyParams: ['scroll', 'scroll_id'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(scroll_request, 'body'),
      ...getShapeAt(scroll_request, 'path'),
      ...getShapeAt(scroll_request, 'query'),
    }),
    z.object({
      ...getShapeAt(scroll1_request, 'body'),
      ...getShapeAt(scroll1_request, 'path'),
      ...getShapeAt(scroll1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(scroll2_request, 'body'),
      ...getShapeAt(scroll2_request, 'path'),
      ...getShapeAt(scroll2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(scroll3_request, 'body'),
      ...getShapeAt(scroll3_request, 'path'),
      ...getShapeAt(scroll3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([scroll_response, scroll1_response, scroll2_response, scroll3_response]),
};
