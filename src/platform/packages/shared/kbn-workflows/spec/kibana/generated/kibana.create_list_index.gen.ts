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
 * Source: /oas_docs/output/kibana.yaml, operations: CreateListIndex
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  create_list_index_request,
  create_list_index_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CREATE_LIST_INDEX_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateListIndex',
  summary: `Create list data streams`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/index</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create \`.lists\` and \`.items\` data streams in the relevant space.`,
  methods: ['POST'],
  patterns: ['/api/lists/index'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createlistindex',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(create_list_index_request, 'body'),
    ...getShapeAt(create_list_index_request, 'path'),
    ...getShapeAt(create_list_index_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: create_list_index_response,
};
