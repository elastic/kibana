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
 * Generated at: 2025-11-27T07:04:28.224Z
 * Source: elasticsearch-specification repository, operations: indices-refresh, indices-refresh-1, indices-refresh-2, indices-refresh-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_refresh1_request,
  indices_refresh1_response,
  indices_refresh2_request,
  indices_refresh2_response,
  indices_refresh3_request,
  indices_refresh3_response,
  indices_refresh_request,
  indices_refresh_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_REFRESH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.refresh',
  connectorGroup: 'internal',
  summary: `Refresh an index`,
  description: `Refresh an index.

A refresh makes recent operations performed on one or more indices available for search.
For data streams, the API runs the refresh operation on the stream’s backing indices.

By default, Elasticsearch periodically refreshes indices every second, but only on indices that have received one search request or more in the last 30 seconds.
You can change this default interval with the \`index.refresh_interval\` setting.

In Elastic Cloud Serverless, the default refresh interval is 5 seconds across all indices.

Refresh requests are synchronous and do not return a response until the refresh operation completes.

Refreshes are resource-intensive.
To ensure good cluster performance, it's recommended to wait for Elasticsearch's periodic refresh rather than performing an explicit refresh when possible.

If your application workflow indexes documents and then runs a search to retrieve the indexed document, it's recommended to use the index API's \`refresh=wait_for\` query parameter option.
This option ensures the indexing operation waits for a periodic refresh before running the search.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-refresh`,
  methods: ['POST', 'GET'],
  patterns: ['_refresh', '{index}/_refresh'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-refresh',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['allow_no_indices', 'expand_wildcards', 'ignore_unavailable'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_refresh_request, 'body'),
      ...getShapeAt(indices_refresh_request, 'path'),
      ...getShapeAt(indices_refresh_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_refresh1_request, 'body'),
      ...getShapeAt(indices_refresh1_request, 'path'),
      ...getShapeAt(indices_refresh1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_refresh2_request, 'body'),
      ...getShapeAt(indices_refresh2_request, 'path'),
      ...getShapeAt(indices_refresh2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_refresh3_request, 'body'),
      ...getShapeAt(indices_refresh3_request, 'path'),
      ...getShapeAt(indices_refresh3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    indices_refresh_response,
    indices_refresh1_response,
    indices_refresh2_response,
    indices_refresh3_response,
  ]),
};
