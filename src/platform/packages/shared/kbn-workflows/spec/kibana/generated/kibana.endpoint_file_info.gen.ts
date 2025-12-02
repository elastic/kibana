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
 * Source: /oas_docs/output/kibana.yaml, operations: EndpointFileInfo
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  endpoint_file_info_request,
  endpoint_file_info_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const ENDPOINT_FILE_INFO_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointFileInfo',
  summary: `Get file information`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/{action_id}/file/{file_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get information for the specified response action file download.
`,
  methods: ['GET'],
  patterns: ['/api/endpoint/action/{action_id}/file/{file_id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointfileinfo',
  parameterTypes: {
    headerParams: [],
    pathParams: ['action_id', 'file_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(endpoint_file_info_request, 'body'),
    ...getShapeAt(endpoint_file_info_request, 'path'),
    ...getShapeAt(endpoint_file_info_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: endpoint_file_info_response,
};
