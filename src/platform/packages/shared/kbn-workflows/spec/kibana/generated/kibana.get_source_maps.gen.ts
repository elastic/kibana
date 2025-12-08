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
 * Source: /oas_docs/output/kibana.yaml, operations: getSourceMaps
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  get_source_maps_request,
  get_source_maps_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const GET_SOURCE_MAPS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getSourceMaps',
  summary: `Get source maps`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/sourcemaps</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get an array of Fleet artifacts, including source map uploads. You must have \`read\` or \`all\` Kibana privileges for the APM and User Experience feature.
`,
  methods: ['GET'],
  patterns: ['/api/apm/sourcemaps'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getsourcemaps',
  parameterTypes: {
    headerParams: ['elastic-api-version'],
    pathParams: [],
    urlParams: ['page', 'perPage'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_source_maps_request, 'body'),
    ...getShapeAt(get_source_maps_request, 'path'),
    ...getShapeAt(get_source_maps_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: get_source_maps_response,
};
