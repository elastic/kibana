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
 * Source: /oas_docs/output/kibana.yaml, operations: PersistFavoriteRoute
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  persist_favorite_route_request,
  persist_favorite_route_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PERSIST_FAVORITE_ROUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PersistFavoriteRoute',
  summary: `Favorite a Timeline or Timeline template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_favorite</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Favorite a Timeline or Timeline template for the current user.`,
  methods: ['PATCH'],
  patterns: ['/api/timeline/_favorite'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-persistfavoriteroute',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['templateTimelineId', 'templateTimelineVersion', 'timelineId', 'timelineType'],
  },
  paramsSchema: z.object({
    ...getShapeAt(persist_favorite_route_request, 'body'),
    ...getShapeAt(persist_favorite_route_request, 'path'),
    ...getShapeAt(persist_favorite_route_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: persist_favorite_route_response,
};
