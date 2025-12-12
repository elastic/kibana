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
 * Source: /oas_docs/output/kibana.yaml, operations: deleteSourceMap
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  delete_source_map_request,
  delete_source_map_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DELETE_SOURCE_MAP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteSourceMap',
  summary: `Delete source map`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/sourcemaps/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a previously uploaded source map. You must have \`all\` Kibana privileges for the APM and User Experience feature.
`,
  methods: ['DELETE'],
  patterns: ['/api/apm/sourcemaps/{id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletesourcemap',
  parameterTypes: {
    headerParams: ['elastic-api-version', 'kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_source_map_request, 'body'),
    ...getShapeAt(delete_source_map_request, 'path'),
    ...getShapeAt(delete_source_map_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: delete_source_map_response,
};
