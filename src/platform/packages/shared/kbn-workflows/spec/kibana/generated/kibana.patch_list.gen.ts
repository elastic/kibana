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
 * Source: /oas_docs/output/kibana.yaml, operations: PatchList
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { patch_list_request, patch_list_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PATCH_LIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PatchList',
  summary: `Patch a value list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update specific fields of an existing list using the list \`id\`.`,
  methods: ['PATCH'],
  patterns: ['/api/lists'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-patchlist',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['_version', 'description', 'id', 'meta', 'name', 'version'],
  },
  paramsSchema: z.object({
    ...getShapeAt(patch_list_request, 'body'),
    ...getShapeAt(patch_list_request, 'path'),
    ...getShapeAt(patch_list_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: patch_list_response,
};
