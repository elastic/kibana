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
 * Source: /oas_docs/output/kibana.yaml, operations: CreateListItem
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  create_list_item_request,
  create_list_item_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CREATE_LIST_ITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateListItem',
  summary: `Create a value list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a value list item and associate it with the specified value list.

All value list items in the same list must be the same type. For example, each list item in an \`ip\` list must define a specific IP address.
> info
> Before creating a list item, you must create a list.
`,
  methods: ['POST'],
  patterns: ['/api/lists/items'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createlistitem',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['id', 'list_id', 'meta', 'refresh', 'value'],
  },
  paramsSchema: z.object({
    ...getShapeAt(create_list_item_request, 'body'),
    ...getShapeAt(create_list_item_request, 'path'),
    ...getShapeAt(create_list_item_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: create_list_item_response,
};
