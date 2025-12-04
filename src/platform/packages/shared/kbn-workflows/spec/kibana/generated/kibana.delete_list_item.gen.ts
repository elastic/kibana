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
 * Source: /oas_docs/output/kibana.yaml, operations: DeleteListItem
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  delete_list_item_request,
  delete_list_item_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DELETE_LIST_ITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteListItem',
  summary: `Delete a value list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a value list item using its \`id\`, or its \`list_id\` and \`value\` fields.`,
  methods: ['DELETE'],
  patterns: ['/api/lists/items'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletelistitem',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'list_id', 'value', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_list_item_request, 'body'),
    ...getShapeAt(delete_list_item_request, 'path'),
    ...getShapeAt(delete_list_item_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: delete_list_item_response,
};
