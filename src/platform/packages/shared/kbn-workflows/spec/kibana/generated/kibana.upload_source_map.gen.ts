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
 * Source: /oas_docs/output/kibana.yaml, operations: uploadSourceMap
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  upload_source_map_request,
  upload_source_map_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const UPLOAD_SOURCE_MAP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.uploadSourceMap',
  summary: `Upload a source map`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/sourcemaps</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upload a source map for a specific service and version. You must have \`all\` Kibana privileges for the APM and User Experience feature.
The maximum payload size is \`1mb\`. If you attempt to upload a source map that exceeds the maximum payload size, you will get a 413 error. Before uploading source maps that exceed this default, change the maximum payload size allowed by Kibana with the \`server.maxPayload\` variable.
`,
  methods: ['POST'],
  patterns: ['/api/apm/sourcemaps'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-uploadsourcemap',
  parameterTypes: {
    headerParams: ['elastic-api-version', 'kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(upload_source_map_request, 'body'),
    ...getShapeAt(upload_source_map_request, 'path'),
    ...getShapeAt(upload_source_map_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: upload_source_map_response,
};
